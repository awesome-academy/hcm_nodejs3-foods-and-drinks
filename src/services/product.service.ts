import { CategoryService } from './category.service';
import { CategoryEntity } from './../entities/category.entity';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/ormConfig';
import { ProductEntity } from '../entities/product.entity';
import { ProductsByCategoryDto } from '../commons/dtos/productsByCategory.dto';
import { Error, NUM_OF_PRODUCT_CARD } from '../constants';
import { ProductPageOptions } from '../commons/dtos/productPageOptions.dto';
import { PageDto } from '../commons/dtos/page.dto';
import { PageMetaDto } from '../commons/dtos/pageMeta.dto';
import { CreateProductDto } from '../commons/dtos/createProduct.dto';
import { ProductSaleNumberDto } from '../commons/dtos/ProductSaleNumber.dto';
import { plainToClass } from 'class-transformer';
import { UserEntity } from '../entities/user.entity';
import { OrderEntity } from '../entities/order.entity';

export class ProductService {
  private readonly productRepository: Repository<ProductEntity>;
  private readonly categoryService: CategoryService;
  private readonly categoryRepository: Repository<CategoryEntity>;
  constructor() {
    this.productRepository = AppDataSource.getRepository(ProductEntity);
    this.categoryRepository = AppDataSource.getRepository(CategoryEntity);
    this.categoryService = new CategoryService();
  }

  public async getDiscountProduct(): Promise<ProductEntity[]> {
    return await this.productRepository.createQueryBuilder('products')
    .where('products.basePrice != products.currentPrice')
    .limit(NUM_OF_PRODUCT_CARD)
    .getMany();
  }

  public async getNewProduct(): Promise<ProductEntity[]> {
    return await this.productRepository.createQueryBuilder('products')
    .orderBy('products.id', 'DESC').limit(NUM_OF_PRODUCT_CARD).getMany();
  }

  public async getProductsByCategory(): Promise<ProductsByCategoryDto[]> {
    const categories = await this.categoryRepository
    .createQueryBuilder('category').getMany();
    const result: ProductsByCategoryDto[] = [];
    for(const category of categories) {
      const products = await this.productRepository
      .createQueryBuilder('products')
      .leftJoinAndSelect('products.categories', 'categories')
      .where('categories.id = :categoryId', {categoryId: category.id})
      .limit(NUM_OF_PRODUCT_CARD)
      .getMany();
      const item = {
        category: category.name,
        categoryId: category.id,
        products: products,
      };
      result.push(item);
    }
    return result;
  }

  public async getProductDetail(id: number): Promise<ProductEntity | null> {
    return await this.productRepository.findOne({
      where: {
        id: id,
      },
      relations: ['categories'],
    });
  }
  
  public async getProductPage(pageOptionsDto: ProductPageOptions) 
  :Promise<PageDto<ProductEntity>> {
    const {
      order,
      take, 
      skip,
      sortField, 
      keyword, 
      rating,
      onSale, 
      categoryIds, 
      minPrice, 
      maxPrice,
    } = pageOptionsDto;
    const query = this.productRepository.createQueryBuilder('product')
    .leftJoinAndSelect('product.categories', 'category');
    
    // Handle filter
    if(categoryIds && categoryIds.length > 0) {
      const categoryIdParams = 
        Array.isArray(categoryIds)? categoryIds : [categoryIds];
      query.andWhere('category.id IN (:...categoryIds)', 
        {categoryIds: categoryIdParams},
      );
    }
    if(minPrice) {
      query.andWhere('product.currentPrice >= :minPrice', 
        {minPrice: minPrice},
      );
    }
    if(maxPrice) {
      query.andWhere('product.currentPrice <= :maxPrice', 
        {maxPrice: maxPrice},
      );
    }
    if(rating) {
      query.andWhere('product.averageRating >= :rating', 
        {rating: rating},
      );
    }
    if(keyword){
      query.andWhere('MATCH(product.name) AGAINST( :keyword IN BOOLEAN MODE)',
       {keyword: keyword},
      );
    }
    if(onSale) {
      query.andWhere('product.currentPrice != product.basePrice');
    }
    //Handle sort
    query.orderBy('product.' + sortField, order)
    .addOrderBy('product.id', 'DESC');

    //Handle paging
    query.skip(skip).take(take);

    // Retrieve entities
    const itemCount = await query.getCount();
    const entities = await query.getMany();

    const pageMeta = new PageMetaDto({pageOptionsDto, itemCount});
    return new PageDto(entities, pageMeta);
  }

  public getAllCategories(): Promise<CategoryEntity[]> {
    return this.categoryRepository.find();
  }

  public async createProduct(createOption: CreateProductDto)
  : Promise<ProductEntity> {
    const category = await this.categoryService
    .findOneById(createOption.categoryId);
    if(category === null) {
      throw Error.CATEGORY_NOT_FOUND;
    }
    const newProduct = this.productRepository.create({
      ...createOption,
      categories: [category],
    });
    return this.productRepository.save(newProduct);
  }

  public async saveProduct(product: ProductEntity)
  : Promise<ProductEntity> {
    return this.productRepository.save(product);
  }

  public async updateProduct(
    product: ProductEntity, 
    updateOptions: CreateProductDto)
  : Promise<ProductEntity> {
    const category = await this.categoryService
    .findOneById(updateOptions.categoryId);
    if(category === null){
      throw Error.CATEGORY_NOT_FOUND;
    }
    this.productRepository.merge(
      product, 
      updateOptions, 
      {categories: [category]},
    );
    return this.productRepository.save(product);
  }

  async getCategoryProductNumber(categoryId: number): Promise<number> {
    const query = this.productRepository.createQueryBuilder('product')
    .leftJoin('product.categories', 'category')
    .where('category.id = :categoryId', {categoryId: categoryId});
    return query.getCount();
  }

  public async getTopPurchasedProduct(limit: number)
  : Promise<ProductSaleNumberDto[]> {
    const query = this.productRepository.createQueryBuilder('product')
    .leftJoin('product.orderProducts', 'orderProduct')
    .select('product.name', 'name')
    .addSelect('SUM(orderProduct.quantity)', 'sellNumber')
    .groupBy('product.id')
    .limit(limit)
    .orderBy('sellNumber', 'DESC')
    .limit(limit);
    const result = await query.getRawMany();
    return plainToClass(ProductSaleNumberDto, result);
  }
      
  async getSuggestionProduct(user?: UserEntity): Promise<ProductEntity[]>{
    if(user == undefined) {
      return [];
    }
    // Get user orders
    const orders = await AppDataSource.getRepository(OrderEntity)
    .createQueryBuilder('order')
    .leftJoinAndSelect('order.orderProducts', 'orderProduct')
    .leftJoinAndSelect('orderProduct.product', 'product')
    .leftJoinAndSelect('product.categories', 'category')
    .where('order.userId = :userId', { userId: user.id })
    .getMany();

    if (orders.length === 0) return [];

    // Count order on each category
    const categoryCount: { [key: string]: number } = {};
    orders.forEach(order => {
      order.orderProducts.forEach(orderProduct => {
        const categoryName = orderProduct.product.categories[0].name;
        if(!categoryCount[categoryName]) {
          categoryCount[categoryName] = 0;
        }
        categoryCount[categoryName] += orderProduct.quantity;
      });
    });

    // Find the category where users have purchased the most
    const mostPurchasedCategory = Object.keys(categoryCount)
    .reduce((a,b)=> categoryCount[a] > categoryCount[b] ? a : b);

    // Retrieve products in the same category, sort by quantity purchased
    const recommendedProducts = await this.productRepository
    .createQueryBuilder('product')
    .leftJoin('product.categories', 'category')
    .leftJoin('product.orderProducts', 'orderProduct')
    .where(
      'category.name = :categoryName', 
      { categoryName: mostPurchasedCategory },
    )
    .orderBy('SUM(orderProduct.quantity)', 'DESC')
    .groupBy('product.id')
    .limit(NUM_OF_PRODUCT_CARD)
    .getMany();
    return recommendedProducts;
  }
}
