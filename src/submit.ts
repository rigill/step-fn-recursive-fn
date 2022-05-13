import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

export async function handler(
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  console.log('Job submitted successfully')
    return Promise.resolve({
        "id": event.id,
        "status": "SUCCEEDED",
    })
}
