import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MAX_CATEGORY_TOTAL } from '../src/categories/categories.constants';
import type { CategoryResponseDto } from '../src/categories/dto/category-response.dto';
import { setupApp } from '../src/setup-app';

describe('Categories API', () => {
  let app: INestApplication;
  let server: Server;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    setupApp(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    await app.close();
  });

  async function createCategory(name = 'Food'): Promise<CategoryResponseDto> {
    const response = await request(server)
      .post('/categories')
      .send({ name })
      .expect(201);

    return response.body as CategoryResponseDto;
  }

  it('starts with an empty category list', async () => {
    await request(server).get('/categories').expect(200, []);
  });

  it('creates a trimmed category with a UUID and zero spending', async () => {
    const category = await createCategory('  Food  ');

    expect(category.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(category).toEqual({
      id: category.id,
      name: 'Food',
      totalAmount: 0,
    });
    await request(server).get('/categories').expect(200, [category]);
  });

  it('accumulates exact cent totals and keeps categories independent', async () => {
    const food = await createCategory('Food');
    const transport = await createCategory('Transport');

    await request(server)
      .post(`/categories/${food.id}/amounts`)
      .send({ amount: 0.1 })
      .expect(200, { ...food, totalAmount: 0.1 });
    await request(server)
      .post(`/categories/${food.id}/amounts`)
      .send({ amount: 0.2 })
      .expect(200, { ...food, totalAmount: 0.3 });
    await request(server)
      .post(`/categories/${transport.id}/amounts`)
      .send({ amount: 1.01 })
      .expect(200, { ...transport, totalAmount: 1.01 });

    await request(server)
      .get('/categories')
      .expect(200, [
        { ...food, totalAmount: 0.3 },
        { ...transport, totalAmount: 1.01 },
      ]);
  });

  it('counts each repeated add request as additional spending', async () => {
    const category = await createCategory();

    for (const totalAmount of [12.5, 25]) {
      await request(server)
        .post(`/categories/${category.id}/amounts`)
        .send({ amount: 12.5 })
        .expect(200, { ...category, totalAmount });
    }
  });

  it('rejects duplicate names after trimming and ignoring case', async () => {
    const category = await createCategory();

    await request(server)
      .post('/categories')
      .send({ name: '  fOoD  ' })
      .expect(409);
    await request(server).get('/categories').expect(200, [category]);
  });

  it.each([
    ['missing', {}],
    ['empty', { name: '' }],
    ['whitespace only', { name: '   ' }],
    ['non-string', { name: 123 }],
    ['null', { name: null }],
    ['too long', { name: 'a'.repeat(101) }],
    ['unexpected field', { name: 'Food', totalAmount: 100 }],
  ])('rejects a %s category name or payload', async (_label, body) => {
    await request(server).post('/categories').send(body).expect(400);
    await request(server).get('/categories').expect(200, []);
  });

  it.each([
    ['missing', {}],
    ['zero', { amount: 0 }],
    ['negative', { amount: -1 }],
    ['fractional cent', { amount: 0.001 }],
    ['string', { amount: '12.50' }],
    ['null', { amount: null }],
    ['too large', { amount: MAX_CATEGORY_TOTAL + 1 }],
    ['unexpected field', { amount: 1, note: 'Lunch' }],
  ])(
    'rejects a %s amount or payload without changing the total',
    async (_label, body) => {
      const category = await createCategory();

      await request(server)
        .post(`/categories/${category.id}/amounts`)
        .send(body)
        .expect(400);
      await request(server).get('/categories').expect(200, [category]);
    },
  );

  it('returns 404 for a missing category and 400 for a malformed UUID', async () => {
    await request(server)
      .post(`/categories/${randomUUID()}/amounts`)
      .send({ amount: 10 })
      .expect(404);
    await request(server)
      .post('/categories/not-a-uuid/amounts')
      .send({ amount: 10 })
      .expect(400);
  });

  it('rejects total overflow without modifying the category', async () => {
    const category = await createCategory();

    await request(server)
      .post(`/categories/${category.id}/amounts`)
      .send({ amount: MAX_CATEGORY_TOTAL })
      .expect(200, { ...category, totalAmount: MAX_CATEGORY_TOTAL });
    await request(server)
      .post(`/categories/${category.id}/amounts`)
      .send({ amount: 0.01 })
      .expect(400);
    await request(server)
      .get('/categories')
      .expect(200, [{ ...category, totalAmount: MAX_CATEGORY_TOTAL }]);
  });

  it('serves Swagger UI and documents exactly the three business routes', async () => {
    await request(server)
      .get('/docs')
      .expect(200)
      .expect('Content-Type', /html/);

    const response = await request(server).get('/docs-json').expect(200);
    const document = response.body as OpenAPIObject;

    expect(Object.keys(document.paths).sort()).toEqual([
      '/categories',
      '/categories/{id}/amounts',
    ]);
    expect(Object.keys(document.paths['/categories']).sort()).toEqual([
      'get',
      'post',
    ]);
    expect(Object.keys(document.paths['/categories/{id}/amounts'])).toEqual([
      'post',
    ]);
    expect(document.paths['/categories'].post?.requestBody).toBeDefined();
    expect(
      document.paths['/categories/{id}/amounts'].post?.requestBody,
    ).toBeDefined();
    expect(
      Object.keys(document.paths['/categories'].post!.responses).sort(),
    ).toEqual(['201', '400', '409']);
    expect(
      Object.keys(
        document.paths['/categories/{id}/amounts'].post!.responses,
      ).sort(),
    ).toEqual(['200', '400', '404']);
    expect(document.paths['/categories'].get?.responses['200']).toBeDefined();
  });
});
