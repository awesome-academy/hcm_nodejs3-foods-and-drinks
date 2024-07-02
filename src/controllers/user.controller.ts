import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { UserNavBar } from '../constants/user';
import { CustomSessionData } from '../interfaces/session.interface';
import { formatDate, handleError } from '../commons/utils';
import { ChangePasswordDto } from '../commons/dtos/changePassword.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { UserEntity } from '../entities/user.entity';
import { t } from 'i18next';
import { Error } from '../constants';
import { UpdateAvatarDto } from '../commons/dtos/updateAvatar.dto';
import { UpdatePersonalInfo } from '../commons/dtos/updatePersonalInfo.dto';

export class UserController {
  private readonly userService: UserService;
  constructor() {
    this.userService = new UserService();
  }

  public getUserProfile = asyncHandler(
    async (req: Request, res: Response) => {
      const user = (req.session as CustomSessionData).user;
      return res.render('user/profile', {
        user, 
        cartItem: (req.session as CustomSessionData).cartItem,
        currentSite: UserNavBar.PROFILE,
        formatDate,
      });
    },
  );

  public changePassword = asyncHandler(
    async (req: Request, res: Response) => {
      const user = (req.session as CustomSessionData).user;
      if(!user) {
        res.status(401).send({
          success: false,
          error: Error.UNAUTHORIZED,
        });
      } else {
        const updateOption = plainToClass(ChangePasswordDto, req.body);
        const rawErrors = await validate(updateOption);
        if(rawErrors.length > 0) {
          const errors = handleError(rawErrors, req, res);
          res.status(400).send({
            success: false,
            errors, 
          });
        } else {
          try {
            const updateResult = 
            await this.userService.changePassword(user, updateOption);
            if(updateResult instanceof UserEntity) {
              res.status(200).send({
                success: true,
                message: t('profile.updateAccount.success'),
              });
            } else {
              res.status(400).send({
                success: false,
                errors: updateResult,
              });
            }
          } catch (error) {
            res.status(400).send({
              success: false,
              error,
            });
          }
        }
      }
    },
  );

  public updateAvatar = asyncHandler(
    async (req: Request, res: Response) => {
      const user = (req.session as CustomSessionData).user;
      if(!user) {
        res.status(401).send({
          success: false,
          error: Error.UNAUTHORIZED,
        });
      } else {
        const updateOption = plainToClass(UpdateAvatarDto, req.body);
        const rawErrors = await validate(updateOption);
        if(rawErrors.length > 0) {
          const errors = handleError(rawErrors, req, res);
          res.status(400).send({
            success: false,
            errors, 
          });
        } else {
          try {
            await this.userService.updateAvatar(user, updateOption);
            res.status(200).send({
              success: true,
              message: t('profile.updateAvatar.success'),
            });
          } catch (error) {
            res.status(400).send({
              success: false,
              error,
            });
          }
        }
      }
    },
  );

  public updatePersonalInfo = asyncHandler(
    async (req: Request, res: Response) => {
      const user = (req.session as CustomSessionData).user;
      if(!user) {
        res.status(401).send({
          success: false,
          error: Error.UNAUTHORIZED,
        });
      } else {
        const updateOption = plainToClass(UpdatePersonalInfo, req.body);
        const rawErrors = await validate(updateOption);
        if(rawErrors.length > 0) {
          const errors = handleError(rawErrors, req, res);
          res.status(400).send({
            success: false,
            errors, 
          });
        } else {
          try {
            await this.userService.updatePersonalInfo(user, updateOption);
            res.status(200).send({
              success: true,
              message: t('profile.updateAvatar.success'),
            });
          } catch (error) {
            res.status(400).send({
              success: false,
              error,
            });
          }
        }
      }
    },
  );
}
