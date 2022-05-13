import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

export async function handler(
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  return Promise.resolve({status: event.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED', id: event.id}) 
}
