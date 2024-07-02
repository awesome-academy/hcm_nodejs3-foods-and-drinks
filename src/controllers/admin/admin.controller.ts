import { AdminService } from '../../services/admin.service';
import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { AdminNavBar } from '../../constants/admin';
import { CustomSessionData } from '../../interfaces/session.interface';
import { OrderService } from '../../services/order.service';
import { formatCurrency, handleError } from '../../commons/utils';
import { ProductService } from '../../services/product.service';
import { Interval, TOP_PURCHASED_PRODUCT_LIMIT } from '../../constants';
import { RevenueAnalysisOption } from '../../commons/dtos/revenueAnalysisOption.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { StoreService } from '../../services/store.service';
import { CategoryService } from '../../services/category.service';

export class AdminController {
  private readonly adminService: AdminService;
  private readonly orderService: OrderService;
  private readonly productService: ProductService;
  private readonly storeService: StoreService;
  private readonly categoryService: CategoryService;
  constructor() {
    this.adminService = new AdminService();
    this.orderService = new OrderService();
    this.productService = new ProductService();
    this.storeService = new StoreService();
    this.categoryService = new CategoryService();
  }

  public getAdminDashboard = asyncHandler(
    async (req: Request, res: Response) => {
      const admin = (req.session as CustomSessionData).admin;
      const commonData = 
      await this.adminService.getAdminDashboardCommonData();
      const numOfOrderByStatus = 
      await this.orderService.getNumberOfOrderByStatus();
      const numOfOrderByPaymentStatus = 
      await this.orderService.getNumberOfOrderByPaymentStatus();
      const topProducts = await this.productService
        .getTopPurchasedProduct(TOP_PURCHASED_PRODUCT_LIMIT);
      const numOfOrderByStore = 
      await this.orderService.getNumberOfOrderByStore();
      return res.render('admin/home', {
        admin, 
        commonData,
        numOfOrderByStatus,
        numOfOrderByPaymentStatus,
        topProducts,
        numOfOrderByStore,
        formatCurrency,
        currentSite: AdminNavBar.DASHBOARD,
      });
    },
  );

  public getAnalysisPage = asyncHandler(
    async (req: Request, res: Response) => {
      const admin = (req.session as CustomSessionData).admin;
      const stores = await this.storeService.getAllStores();
      const categories = await this.categoryService.getAllCategories();
      const revenueOption = {interval: Interval.DAY};
      const revenueAnalysisData =  
        await this.orderService.getRevenue(revenueOption);
      const storeAnalysisData = 
          await this.orderService.getStoreRevenue(revenueOption);
      const productAnalysisData = 
          await this.orderService.getProductAnalysis(revenueOption);
      return res.render('admin/analysis', {
        admin,
        currentSite: AdminNavBar.ANALYTIC,
        stores,
        categories,
        revenueAnalysisData,
        storeAnalysisData,
        productAnalysisData,
      });
    },
  );

  public getRevenueAnalysis = asyncHandler(
    async (req: Request, res: Response) => {
      const option = plainToClass(RevenueAnalysisOption, req.query);
      const rawErrors = await validate(option);
      if(rawErrors.length > 0) {
        const errors = handleError(rawErrors, req, res);
        res.status(400).send({
          success: false,
          errors,
        });
      } else {
        const analysisData = 
          await this.orderService.getRevenue(option);
        res.status(200).send({
          success:true,
          chartData: analysisData,
        });
      }
    },
  );

  public getStoreRevenueAnalysis = asyncHandler(
    async (req: Request, res: Response) => {
      const option = plainToClass(RevenueAnalysisOption, req.query);
      const rawErrors = await validate(option);
      if(rawErrors.length > 0) {
        const errors = handleError(rawErrors, req, res);
        res.status(400).send({
          success: false,
          errors,
        });
      } else {
        const analysisData = 
          await this.orderService.getStoreRevenue(option);
        res.status(200).send({
          success:true,
          chartData: analysisData,
        });
      }
    },
  );

  public getProductAnalysis = asyncHandler(
    async (req: Request, res: Response) => {
      const option = plainToClass(RevenueAnalysisOption, req.query);
      const rawErrors = await validate(option);
      if(rawErrors.length > 0) {
        const errors = handleError(rawErrors, req, res);
        res.status(400).send({
          success: false,
          errors,
        });
      } else {
        const analysisData = 
          await this.orderService.getProductAnalysis(option);
        res.status(200).send({
          success:true,
          chartData: analysisData,
        });
      }
    },
  );
}
