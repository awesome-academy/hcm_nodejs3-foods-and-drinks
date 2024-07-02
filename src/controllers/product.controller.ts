import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { ProductEntity } from '../entities/product.entity';
import { Error, ProductSortField } from '../constants';
import { plainToClass } from 'class-transformer';
import { ProductPageOptions } from '../commons/dtos/productPageOptions.dto';
import { validate } from 'class-validator';
import { formatCurrency, handleError } from '../commons/utils';
import { CustomSessionData } from '../interfaces/session.interface';
import { FeedbackPageOptions } from '../commons/dtos/feedbackPageOption.dto';
import { FeedbackService } from '../services/feedback.service';

export class ProductController {
  private readonly productService: ProductService;
  private readonly feedbackService: FeedbackService;
  constructor(){
    this.productService = new ProductService();
    this.feedbackService = new FeedbackService();
  }
  
  public getHomePage = asyncHandler(
    async (req: Request, res: Response) => {
      const user = (req.session as CustomSessionData).user;
      const data = await this.productService.getProductsByCategory();
      const newProduct = await this.productService.getNewProduct();
      const discountProduct = await this.productService.getDiscountProduct();
      const suggestionProduct = await this.productService
      .getSuggestionProduct(user);
      return res.render('user/home', {
        user,
        cartItem: (req.session as CustomSessionData).cartItem,
        newProduct, 
        discountProduct, 
        suggestionProduct,
        data, 
        formatCurrency,
      });
    },
  );

  public getProductDetail = asyncHandler(
    async (req: Request, res: Response) => {
      const user = (req.session as CustomSessionData).user;
      const product = await this.getProductFromIdParam(req, res);
      if(product === null) {
        req.flash('error', Error.PRODUCT_NOT_FOUND);
        return res.redirect('/home');
      }
      const feedbackPageOptions = new FeedbackPageOptions();
      feedbackPageOptions.productId = product?.id;
      const feedbackPage = 
        await this.feedbackService.getFeedbackPage(feedbackPageOptions);
      return res.render('user/product/detail', {
        user, 
        cartItem: (req.session as CustomSessionData).cartItem,
        product, 
        feedbacks: feedbackPage.data,
        meta: feedbackPage.meta,
        formatCurrency,
      });
    },
  );

  private getProductFromIdParam = async (
    req: Request,
    res: Response,
  ): Promise<ProductEntity | null> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      req.flash('error', 'error.invalidParameter');
      res.redirect('/home');
    }
    return await this.productService.getProductDetail(id);
  };

  public getUserProductPage = asyncHandler(
    async (req: Request, res: Response) => {
      const user = (req.session as CustomSessionData).user;
      const pageOptions = plainToClass(ProductPageOptions, req.query);
      const rawErrors = await validate(pageOptions);
      const categories = await this.productService.getAllCategories();
      if( rawErrors.length > 0 ){
        const errors = handleError(rawErrors, req, res);
        return res.render('user/product/search', {
          user,
          cartItem: (req.session as CustomSessionData).cartItem,
          categories,
          sortField: ProductSortField,
          errors, 
          query: pageOptions,
          formatCurrency,
        });
      }
      const productPage = await this.productService.getProductPage(pageOptions);
      return res.render('user/product/search', {
        user,
        cartItem: (req.session as CustomSessionData).cartItem,
        categories,
        sortField: ProductSortField,
        products: productPage.data, 
        meta: productPage.meta, 
        query: pageOptions,
        formatCurrency,
      });
    },
  );

  public getNotFoundPage = asyncHandler(
    async (req: Request, res: Response) => {
      return res.render('errors/404');
    },
  );
}
