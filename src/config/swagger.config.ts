import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const setupSwagger = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('Janus Journey Journeys Microservice')
    .setDescription(
      'Internal REST API for the Janus Journey, Folder, and Task domains.',
    )
    .setVersion('1.0.0')
    .addApiKey(
      {
        description: 'Internal ms-journeys API key.',
        in: 'header',
        name: 'x-api-key',
        type: 'apiKey',
      },
      'X-API-Key',
    )
    .addApiKey(
      {
        description: 'Authenticated user identity propagated by the BFF.',
        in: 'header',
        name: 'x-user-id',
        type: 'apiKey',
      },
      'X-User-Id',
    )
    .addSecurityRequirements({ 'X-API-Key': [], 'X-User-Id': [] })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const operationKeys = [
    'delete',
    'get',
    'head',
    'options',
    'patch',
    'post',
    'put',
    'trace',
  ] as const;

  for (const pathItem of Object.values(document.paths)) {
    if (!pathItem) continue;

    if (pathItem.parameters) {
      pathItem.parameters = pathItem.parameters.filter(
        (parameter) =>
          !(
            'in' in parameter &&
            parameter.in === 'header' &&
            parameter.name === 'x-user-id'
          ),
      );
    }

    for (const operationKey of operationKeys) {
      const operation = pathItem[operationKey];
      if (!operation?.parameters) continue;

      operation.parameters = operation.parameters.filter(
        (parameter) =>
          !(
            'in' in parameter &&
            parameter.in === 'header' &&
            parameter.name === 'x-user-id'
          ),
      );
    }
  }

  SwaggerModule.setup('docs', app, document);
};
