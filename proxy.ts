// // // proxy.ts - 仅在显式配置代理变量时启用；否则不影响本地与内网请求
// // import { ProxyAgent, setGlobalDispatcher } from 'undici';

// // const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

// // if (process.env.UNDICI_NO_IPV6 === undefined) {
// //   process.env.UNDICI_NO_IPV6 = '1';
// // }

// // if (proxyUrl) {
// //   setGlobalDispatcher(new ProxyAgent(proxyUrl));
// //   console.log('🔌 Undici global proxy enabled:', proxyUrl);
// // } else {
// //   console.log('🔌 Undici global proxy disabled (no HTTP(S)_PROXY set)');
// // }
// // proxy.ts - 仅在显式配置代理变量时启用；否则不影响本地与内网请求
// // proxy.ts - 仅在显式配置代理变量时启用；否则不影响本地与内网请求
// import { ProxyAgent, Agent, setGlobalDispatcher } from 'undici';

// const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

// if (process.env.UNDICI_NO_IPV6 === undefined) {
//   process.env.UNDICI_NO_IPV6 = '1';
// }

// // 设置 NO_PROXY，排除本地地址，避免本地服务（如 Inngest、数据库）走代理
// const noProxyHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
// if (!process.env.NO_PROXY) {
//   process.env.NO_PROXY = noProxyHosts.join(',');
// } else {
//   const existing = process.env.NO_PROXY.split(',');
//   const combined = [...new Set([...existing, ...noProxyHosts])];
//   process.env.NO_PROXY = combined.join(',');
// }

// if (proxyUrl) {
//   // 创建代理 Agent
//   const proxyAgent = new ProxyAgent(proxyUrl);
//   // 创建直连 Agent（不使用代理）
//   const directAgent = new Agent();
  
//   // 创建条件 dispatcher：根据 URL 决定是否使用代理
//   const conditionalDispatcher = {
//     dispatch: (options: any, handler: any) => {
//       const url = options.origin || options.path || '';
//       const hostname = typeof url === 'string' 
//         ? new URL(url.startsWith('http') ? url : `http://${url}`).hostname
//         : '';
      
//       // 检查是否是本地地址
//       const shouldBypassProxy = noProxyHosts.some(host => 
//         hostname === host || hostname.includes(host)
//       ) || hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('0.0.0.0');
      
//       // 根据条件选择使用代理或直连
//       const agent = shouldBypassProxy ? directAgent : proxyAgent;
//       return agent.dispatch(options, handler);
//     },
//   };
  
//   setGlobalDispatcher(conditionalDispatcher as any);
//   console.log('🔌 Undici conditional proxy enabled:', proxyUrl);
//   console.log('🔌 NO_PROXY hosts:', process.env.NO_PROXY);
// } else {
//   console.log('🔌 Undici global proxy disabled (no HTTP(S)_PROXY set)');
// }