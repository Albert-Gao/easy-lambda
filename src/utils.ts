import { Middleware, PlainObject } from 'types';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

export const funcQueueExecutor = async ({
  event,
  context,
  handler,
  beforeHooks = [],
  afterHooks = [],
}: {
  event: APIGatewayProxyEvent;
  context: Context;
  handler: Middleware;
  beforeHooks?: Middleware[];
  afterHooks?: Middleware[];
}) => {
  let returnValue: PlainObject = {};

  const allFuncs = [...beforeHooks, handler, ...afterHooks];
  const startIndex = 0;
  const endIndex = allFuncs.length - 1;
  let passDownObj = {};

  for (let i = startIndex; i <= endIndex; i += 1) {
    const result = allFuncs[i]({
      event,
      context,
      passDownObj,
    }) as PlainObject;

    if (result) {
      returnValue = result;
    }
  }

  return returnValue;
};

export const createTraceInfo = (
  event: APIGatewayProxyEvent,
  context: Context
) => ({
  endpoint:
    event.requestContext?.domainName ?? '' + event.requestContext?.path ?? '',
  requestBody: event.body || '',
  requestMethod: event.requestContext?.httpMethod ?? '',

  country: event.headers?.['CloudFront-Viewer-Country'] ?? '',
  lambdaRequestId: context.awsRequestId ?? '',
  logStreamName: context.logStreamName ?? '',
  logGroupName: context.logGroupName ?? '',
  apiGatewayId: event.requestContext?.requestId ?? '',
});

export const addTraceInfoToResponseBody = (
  responseBody: string | number | boolean | any[] | object,
  event: APIGatewayProxyEvent,
  context: Context
):
  | {
      response: any;
      debug: ReturnType<typeof createTraceInfo>;
    }
  | (PlainObject & { debug: ReturnType<typeof createTraceInfo> }) => {
  const traceInfo = createTraceInfo(event, context);

  if (
    typeof responseBody === 'string' ||
    typeof responseBody === 'number' ||
    typeof responseBody === 'boolean' ||
    Array.isArray(responseBody)
  ) {
    return {
      response: responseBody,
      debug: traceInfo,
    };
  }

  return {
    ...responseBody,
    debug: traceInfo,
  };
};

export const logRequestInfo = (
  event: APIGatewayProxyEvent,
  context: Context
) => {
  console.log(
    'Aws-Api-Gateway-Request-Id: ',
    event.requestContext?.requestId ?? ''
  );
  console.log(
    'Identity-Source-Ip: ',
    event.requestContext?.identity?.sourceIp ?? ''
  );
  console.log('EVENT: ', event);
  console.log('CONTEXT: ', context);
};
