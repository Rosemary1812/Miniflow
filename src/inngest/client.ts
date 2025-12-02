import { Inngest } from 'inngest';

// Create a client to send and receive events
export const inngest = new Inngest({ id: 'n9n' });
// import { Inngest } from 'inngest';
// import { fetch as undiciFetch, Agent } from 'undici';

// /**
//  * 创建一个不使用代理的 fetch 函数，用于 Inngest 客户端
//  * 这样可以避免本地 Inngest 服务走代理导致连接失败
//  */
// const noProxyFetch = (url: string | URL | Request, init?: RequestInit) => {
//   // 创建一个不使用代理的 Agent
//   const agent = new Agent({
//     // 不设置 proxy，直接连接
//   });
  
//   // 使用 undici 的 fetch，但通过自定义的 dispatcher 绕过全局代理
//   return undiciFetch(url, {
//     ...init,
//     dispatcher: agent,
//   });
// };

// /**
//  * Inngest 客户端
//  * 使用自定义 fetch 绕过代理，避免本地服务连接失败
//  */
// export const inngest = new Inngest({ 
//   id: 'n9n',
//   fetch: noProxyFetch,
// });