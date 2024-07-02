import { OrderController } from './../controllers/order.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';

const userRoute: Router = Router();
const orderController = new OrderController();
const userController = new UserController();

userRoute.use(authenticateJwt);
userRoute.get('/order', orderController.getUserOrderPage);
userRoute.put('/order/update', orderController.updateOrderStatus);
userRoute.get('/order/:id', orderController.getUserOrderDetail);
userRoute.get('/profile', userController.getUserProfile);
userRoute.put('/profile/password', userController.changePassword);
userRoute.put('/profile/avatar', userController.updateAvatar);
userRoute.put('/profile/personal-info', userController.updatePersonalInfo);

export default userRoute;
