import {
  funcQueueExecutor,
  logRequestInfo,
  addTraceInfoToResponseBody,
  transformResponseToHttpResponse,
} from './utils';
import { Middleware, IHttpResponse } from './types';
import { HttpResponse, HttpError, buildResponseObject } from './httpResponse';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from 'aws-lambda';

const { internalError } = HttpResponse;

export function lambdas<ResponseDataType = any, Shared = any>(
  middlewares: Middleware<ResponseDataType, Shared>[] = [],
  config?: {
    addTraceInfoToResponse?: boolean;
    logRequestInfo?: boolean;
  }
) {
  const wrapperHandler: Handler<
    APIGatewayProxyEvent,
    APIGatewayProxyResult
  > = async (event, context) => {
    let isErrorResponse = false;
    let response: HttpError | IHttpResponse = internalError({
      body: {
        error: 'Response not set',
      },
    });

    try {
      // @ts-ignore
      response = await funcQueueExecutor<ResponseDataType, Shared>({
        event,
        context,
        middlewares,
      });
    } catch (error) {
      response = error as HttpError;
      isErrorResponse = true;
    } finally {
      response = transformResponseToHttpResponse(response, isErrorResponse);

      if (config?.logRequestInfo) {
        logRequestInfo(event, context);
      }

      if (config?.addTraceInfoToResponse) {
        response.body = addTraceInfoToResponseBody(
          response.body,
          event,
          context
        );
      }

      const result = buildResponseObject({
        ...response,
      });

      if (typeof result.body === 'object') {
        result.body = JSON.stringify(result.body);
      }

      return result;
    }
  };

  return wrapperHandler;
}
