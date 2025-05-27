import {ErrorToHttp} from '../types/http';
import ResourceSchema, {helpers} from './index';
import * as yup from 'yup';

describe('ResourceSchema', () => {
  /*it(`should infer type`, () => {
    const sch = new ResourceSchema(
      'test',
      yup.object({
        string: helpers.string({ $update: false, $view: false}).required(),
        integer: helpers.integer({ $update: false, $view: false}).required(),
        number: helpers.number({ $update: false }).required(),
        dateTime: helpers.dateTime({ $update: false }).required(),
        boolean: helpers.boolean().required({ $view: false }),
      }),
    );

    type T1 = yup.InferType<typeof sch.yup>;
    type T2 = yup.InferType<typeof sch.createSchema>;
    type T3 = yup.InferType<typeof sch.updateSchema>;
    type T4 = yup.InferType<typeof sch.viewSchema>;

    const x : T1 = {
      id: 1,
      string: 'public',
      xxxx: 1222,
      integer: '9',
      number: 9.9,
      dateTime: new Date(),
      boolean: true,
    };
    const x2 : T3 = {
      id: 1,
      string: 'public',
      xxxx: 1222,
      integer: '9',
      number: 9.9,
      dateTime: new Date(),
      boolean: true,
    };
    const x3 : T4 = {
      id: 1,
      string: 'public',
      xxxx: 1222,
      integer: '9',
      number: 9.9,
      dateTime: new Date(),
      boolean: true,
    };

    expect(sch.yup).toBeInstanceOf(yup.ObjectSchema);
  });*/

  it('should create schema', () => {
    const sch = new ResourceSchema(
      yup.object({
        id: helpers.number().required(),
        string: helpers.string().required(),
        integer: helpers.integer().required(),
        number: helpers.number().required(),
        dateTime: helpers.dateTime().required(),
        boolean: helpers.boolean().required(),
      }),
    );

    expect(sch).toBeInstanceOf(ResourceSchema);
  });

  /*
  it('should filter view', async () => {
    const sch = new ResourceSchema(
      'test',
      yup.object({
        id: helpers.number().required(),
        string: helpers.string().required(),
        integer: helpers.integer().required(),
        reverse: helpers.string({
          $required: true,
          $view: (s: unknown) => (s as string).toUpperCase(),
        }),
        secret: helpers.string().required().meta({$view: false}),
        restricted: helpers.string().required().meta({
          $view: 'view.real.restricted', // must have this permission
        }),
      }),
    );

    sch.permissionName = 'real';

    const data: IDataRecord = {
      id: 1,
      string: 'public',
      integer: 9,
      reverse: 'abcd',
      secret: 'nobody-see-me',
      restricted: 'only-allowed',
    };

    const result1 = await sch.viewAs(data, {
      permissions: ['view.real', 'view.real.restricted'],
    });

    expect(result1).toEqual({
      id: 1,
      string: 'public',
      integer: 9,
      reverse: 'ABCD',
      restricted: 'only-allowed',
    });

    expect(result1).not.toHaveProperty(['secret']);

    const result2 = await sch.viewAs(data, {
      permissions: ['view.real'],
    });

    // must not see restricted field
    expect(result2).toEqual({
      id: 1,
      string: 'public',
      integer: 9,
      reverse: 'ABCD',
    });
    expect(result2).not.toHaveProperty(['restricted']);
    expect(result2).not.toHaveProperty(['secret']);
  });
*/
  it('should validate', async () => {
    const sch = new ResourceSchema(
      yup.object({
        id: helpers.number().required(),
        string: helpers.string().required(),
        upperCase: helpers.string(),
        required: helpers.string().required(),
        short: yup.string().required().max(3),
        virtual: helpers.string({$virtual: true}),
        restricted: helpers.string({
          $create: false,
          $update: 'update.test.god',
        }),
      }),
    );

    /*
    sch.preUpdate = (data: IDataRecord, {raw}) => {
      return {
        ...data,
        upperCase: `${data['upperCase']}`.toUpperCase(),
        restricted: `${data['upperCase']}`.toUpperCase(),
        hashed: `hashed[${raw['virtual']}]`,
      };
    };
    */
    const data = {
      id: 1,
      string: 'public',
      upperCase: 'abcd',
      short: 'xyz',
      virtual: 'VirTualz',
    };

    const result1 = await sch.validate('update', data, {
      permissions: ['update.test'],
    });

    // Must included calculated field `restricted` and dropped virtual fields
    expect(result1).toEqual({
      id: 1,
      string: 'public',
      upperCase: 'abcd',
      //restricted: 'abcd',
      short: 'xyz',
      // hashed: 'hashed[VirTualz]',
    });
    expect(result1).not.toHaveProperty(['virtual']);

    // cannot create without "create.test" permission
    await expect(
      sch.validate('create', data, {
        permissions: ['update.test'],
      }),
    ).rejects.toThrow('Permission denied');

    // can not create without required fields
    await expect(
      sch.validate('create', data, {
        permissions: ['create.test'],
      }),
    ).rejects.toThrow();

    // can not create without required fields
    await expect(
      sch.validate(
        'create',
        {...data, short: 'nope'},
        {
          permissions: ['create.test'],
        },
      ),
    ).rejects.toThrow();

    let e: ErrorToHttp | null = null;
    try {
      await sch.validate(
        'create',
        {...data, short: 'nope'},
        {
          permissions: ['create.test'],
        },
      );
    } catch (er) {
      e = er as ErrorToHttp;
    }

    expect(e).toBeInstanceOf(ErrorToHttp);
    expect(e?.statusCode).toBe(400);
    expect(e?.body).toEqual({
      message: 'Invalid input',
      errors: {
        required: 'required is a required field',
        short: 'short must be at most 3 characters',
      },
    });

    // can create now
    await expect(
      sch.validate(
        'create',
        {
          ...data,
          required: 'nope',
        },
        {
          permissions: ['create.test'],
        },
      ),
    ).resolves.not.toThrow();

    // cant create/edit special permission fields
    await expect(
      sch.validate(
        'create',
        {
          ...data,
          restricted: 'hacked',
        },
        {
          permissions: ['update.test'],
        },
      ),
    ).rejects.toThrow('Permission denied');

    await expect(
      sch.validate(
        'update',
        {...data, restricted: 'hacked'},
        {
          permissions: ['update.test'],
        },
      ),
    ).rejects.toThrow('Permission denied');
  });
});
