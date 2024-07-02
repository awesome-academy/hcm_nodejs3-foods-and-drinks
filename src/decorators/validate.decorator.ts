import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { StoreService } from '../services/store.service';
import { OrderType } from '../constants';
import { CategoryService } from '../services/category.service';

const storeService = new StoreService();
const categoryService = new CategoryService();

export function GreaterThanOrEqual(
  min: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'greaterThan',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [min], // Pass the min value as a constraint
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Allow undefined for optional properties
          // Assert the type of args.object to Record<string, unknown>
          const typedObject = args.object as Record<string, unknown>;
          if (typedObject[propertyName] === undefined) {
            return true;
          }
          const [min] = args.constraints;
          if (typeof value === 'string') {
            if (value === '') return true;
            return parseInt(value) >= min;
          }
          return typeof value === 'number' && value >= min;
        },
      },
    });
  };
}

export function LessThanOrEqual(
  max: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'lessThan',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [max], // Pass the max value as a constraint
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Allow undefined for optional properties
          // Assert the type of args.object to Record<string, unknown>
          const typedObject = args.object as Record<string, unknown>;
          if (typedObject[propertyName] === undefined) {
            return true;
          }
          const [max] = args.constraints;
          if (typeof value === 'string') {
            if (value === '') return true;
            return parseInt(value) <= max;
          }
          return typeof value === 'number' && value <= max;
        },
      },
    });
  };
}

export function IsValidOrderAddress(
  length: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidOrderAddress',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [length], // Pass the max value as a constraint
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Allow undefined for optional properties
          // Assert the type of args.object to Record<string, unknown>
          const typedObject = args.object as Record<string, unknown>;
          if (typedObject['orderType'] === OrderType.DELIVERY) {
            if (
              typedObject[propertyName] === undefined ||
              typeof value !== 'string' ||
              value.length < length
            ) {
              return false;
            }
          }
          return true;
        },
      },
    });
  };
}

export function IsValidStoreId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidStoreId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        async validate(value: any, args: ValidationArguments) {
          const typedObject = args.object as Record<string, unknown>;
          if (typedObject['orderType'] === OrderType.PICK_UP) {
            if (typedObject[propertyName] === undefined) {
              return false;
            } else {
              const store = await storeService.findOneById(value);
              if (store === null) return false;
            }
          }
          return true;
        },
      },
    });
  };
}

export function IsValidCategoryId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidCategoryId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        async validate(value: any, args: ValidationArguments) {
          const store = await categoryService.findOneById(value);
          return store !== null;
        },
      },
    });
  };
}

export function IsCurrentPriceLessThanOrEqualBasePrice(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCurrentPriceGreaterThanOrEqualBasePrice',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const object = args.object as any;
          return value <= object.basePrice;
        },
      },
    });
  };
}

export function IsValidDOB(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidDOB',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        async validate(value: string, args: ValidationArguments) {
          const dateValue = new Date(value);

          const currentDate = new Date();
          // Valid if it's a valid past date
          return dateValue < currentDate;
        },
      },
    });
  };
}

export function IsDateInThePast(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDateInThePast',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        validate(value: string, args: ValidationArguments) {
          if (!value) return true; // skip validation if no date is provided
          const dateValue = new Date(value);
          const currentDate = new Date();
          return dateValue < currentDate;
        },
      },
    });
  };
}

export function IsStartDateBeforeEndDate(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStartDateBeforeEndDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: string, args: ValidationArguments) {
          const relatedValue = (args.object as any)[args.constraints[0]];
          if (!value || !relatedValue) return true; // skip validation if dates are not provided
          const startDate = new Date(value);
          const endDate = new Date(relatedValue);
          return startDate < endDate;
        },
      },
    });
  };
}

export function IsPasswordMatching(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPasswordMatching',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value === relatedValue;
        },
      },
    });
  };
}
