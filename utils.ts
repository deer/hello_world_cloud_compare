import { ConnInfo } from "https://deno.land/std@0.173.0/http/server.ts";

export function getEnvs() {
  const APP_ID = Deno.env.get("APP_ID");
  const URI_STUB = Deno.env.get("URI_STUB");
  const DATA_SOURCE = Deno.env.get("DATA_SOURCE");
  const DATA_API_KEY = Deno.env.get("DATA_API_KEY")!;
  const DB_NAME = Deno.env.get("DB_NAME");
  const COLLECTION_NAME = Deno.env.get("COLLECTION_NAME");
  const BASE_URI = `${URI_STUB}${APP_ID}/endpoint/data/v1/action`;
  const HOSTING_SERVICE = Deno.env.get("HOSTING_SERVICE");
  const VERBOSE = Deno.env.get("VERBOSE");
  return {
    DATA_SOURCE,
    DATA_API_KEY,
    DB_NAME,
    COLLECTION_NAME,
    BASE_URI,
    HOSTING_SERVICE,
    VERBOSE,
  };
}

type resultSchema = {
  documents: {
    _id: string;
    visitsPerHost: number;
  }[];
};

export async function handle(
  req: Request,
  connInfo: ConnInfo,
  envs: ReturnType<typeof getEnvs>
): Promise<Response> {
  // if it's a favicon request, don't do anything
  if (req.url.includes("favicon")) {
    return new Response();
  }

  if (envs.VERBOSE === "true") {
    console.log("req");
    console.log(req);
    console.log("connInfo");
    console.log(connInfo);
  }

  const proxiedServerIp = req.headers.get("proxied.server.ip") || "";
  const proxiedRequesterIp = req.headers.get("proxied.requester.ip") || "";
  const requesterIp = getRequesterIp(req, connInfo, proxiedServerIp, proxiedRequesterIp);

  await postNewConnection(requesterIp, envs);
  const result = await getConnectionRecords(envs) as resultSchema;

  const personalVisits = result.documents.find((x) => x._id === requesterIp)?.visitsPerHost || 0;
  const totalVisits = result.documents.map((x) => x.visitsPerHost).reduce((a, b) => a + b);

  if (proxiedServerIp != "" && proxiedRequesterIp != "") {
    const response = {
      personalVisits: personalVisits,
      totalVisits: totalVisits,
      hostingService: envs.HOSTING_SERVICE,
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  } else {
    let responseString =
      `Hello ${requesterIp}, you're visiting this page directly, served by ${envs.HOSTING_SERVICE}.\n`;
    responseString += `This page has been visited ${numToTimes(totalVisits)}. `;
    responseString += `You've visited ${numToTimes(personalVisits)}.`;
    return new Response(responseString, {
      status: 200,
      headers: {
        "content-type": "text/plain",
      },
    });
  }
}

function getRequesterIp(req: Request, connInfo: ConnInfo, proxiedServerIp: string, proxiedRequesterIp: string): string {
  let hostnameFromAddress = (connInfo.remoteAddr as Deno.NetAddr)?.hostname;
  let serverFromAddress = (connInfo.localAddr as Deno.NetAddr)?.hostname;
  if (hostnameFromAddress === undefined) {
    // a hack for netlify context coming in here at runtime
    hostnameFromAddress = connInfo.ip;
  }
  const forwardedHost = req.headers.get("x-forwarded-for") || "";
  const hostnameFromForwarded = forwardedHost.split(",")[0];
  let host = hostnameFromForwarded != "" && hostnameFromForwarded != "::1" ? hostnameFromForwarded : hostnameFromAddress;
  host = proxiedRequesterIp != "" ? proxiedRequesterIp : host;
  console.log({ proxiedServerIp, proxiedRequesterIp, serverFromAddress });
  console.log({ hostnameFromAddress, forwardedHost, hostnameFromForwarded, host });
  return host;
}



const postNewConnection = async (host: string, envs: ReturnType<typeof getEnvs>) => {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": envs.DATA_API_KEY,
    },
    body: "",
  };

  try {
    const URI = `${envs.BASE_URI}/insertOne`;
    const query = {
      dataSource: envs.DATA_SOURCE,
      database: envs.DB_NAME,
      collection: envs.COLLECTION_NAME,
      document: { host: host, platform: envs.HOSTING_SERVICE },
    };
    options.body = JSON.stringify(query);
    const dataResponse = await fetch(URI, options);
    const result = await dataResponse.json();
    return result;
  } catch (err) {
    console.log(err);
  }
};

const getConnectionRecords = async (envs: ReturnType<typeof getEnvs>) => {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": envs.DATA_API_KEY,
    },
    body: "",
  };
  try {
    const URI = `${envs.BASE_URI}/aggregate`;
    const query = {
      dataSource: envs.DATA_SOURCE,
      database: envs.DB_NAME,
      collection: envs.COLLECTION_NAME,
      pipeline: [{ $group: { _id: "$host", visitsPerHost: { $count: {} } } }],
    };
    options.body = JSON.stringify(query);
    const dataResponse = await fetch(URI, options);
    const allConnectionRecords = await dataResponse.json();
    return allConnectionRecords;
  } catch (err) {
    console.log(err);
  }
};

function numToTimes(visits: number): string {
  if (visits > 0) {
    if (visits == 1) {
      return "1 time";
    } else {
      return `${visits} times`;
    }
  }
  throw "error";
}
