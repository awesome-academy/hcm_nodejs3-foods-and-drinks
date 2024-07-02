import { IsNotEmpty, MinLength } from 'class-validator';
import { REGISTER_FIELD_MIN_LENGTH } from '../../constants';
import { IsPasswordMatching } from '../../decorators';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'error.password.notEmpty' })
  @MinLength(REGISTER_FIELD_MIN_LENGTH, { message: 'error.password.minLength' })
  password: string;

  @IsNotEmpty({ message: 'error.password.notEmpty' })
  @MinLength(REGISTER_FIELD_MIN_LENGTH, { message: 'error.userName.minLength' })
  newPassword: string;

  @IsNotEmpty({ message: 'error.confirmPassword.notEmpty' })
  @IsPasswordMatching('newPassword', {
    message: 'error.confirmPassword.notMatching',
  })
  confirmPassword: string;
}
