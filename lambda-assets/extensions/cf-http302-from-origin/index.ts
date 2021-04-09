import { String } from 'aws-sdk/clients/cloudsearch';
import axios, { AxiosResponse } from 'axios';

export interface HttpResponse {
  readonly status: number;
  readonly statusDescription: string;
  readonly headers: { [key: string]: {[key: string]: String}[] },
  readonly body: string,
}

export async function HttpGet(url: string): Promise<AxiosResponse> {
  const client = axios.create();
  const response: AxiosResponse<any> = await client.get(url)
  return response
}

export async function handler(event: any) {
  const response = event.Records[0].cf.response;
  console.log('response: %j', response)
  if (response.status === '302' && response.headers['location'].length != 0) {
    const locationUrl = response.headers['location'][0].value;
    const newResponse = await HttpGet(locationUrl)
    const responseObject: HttpResponse = {
      headers: {
        'cache-control': [{
          key: 'Cache-Control',
          value: `max-age=0`,
        }],
      },
      status: newResponse.status,
      statusDescription: newResponse.statusText,
      body: newResponse.data,
    }
    return responseObject
  } else {
    return response;
  }
};


function cacheControl(responseObject: HttpResponse,  maxAge: string) {
  return Object.assign(responseObject, {
    headers: {
      'cache-control': [{
        key: 'Cache-Control',
        value: `max-age=${maxAge}`,
      }],
    }
  })
}
