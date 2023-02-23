import { ConnInfo } from "https://deno.land/std@0.173.0/http/server.ts";
import { Context } from "netlify:edge";

export default async (req: Request, context: Context) => {
  // if it's a favicon request, don't do anything
  if (req.url.includes("favicon")) {
    return new Response();
  }

  console.log(Deno.env.toObject());

  const APP_ID = Deno.env.get("APP_ID");
  const URI_STUB = Deno.env.get("URI_STUB");
  const DATA_SOURCE = Deno.env.get("DATA_SOURCE");
  const DATA_API_KEY = Deno.env.get("DATA_API_KEY")!;
  const DB_NAME = Deno.env.get("DB_NAME");
  const COLLECTION_NAME = Deno.env.get("COLLECTION_NAME");
  const BASE_URI = `${URI_STUB}${APP_ID}/endpoint/data/v1/action`;
  const HOSTING_SERVICE = Deno.env.get("HOSTING_SERVICE");

  const getConnectionRecords = async () => {
    try {
      const URI = `${BASE_URI}/aggregate`;
      const query = {
        dataSource: DATA_SOURCE,
        database: DB_NAME,
        collection: COLLECTION_NAME,
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

  const postNewConnection = async (host: string) => {
    try {
      const URI = `${BASE_URI}/insertOne`;
      const query = {
        dataSource: DATA_SOURCE,
        database: DB_NAME,
        collection: COLLECTION_NAME,
        document: { host: host },
      };
      options.body = JSON.stringify(query);
      const dataResponse = await fetch(URI, options);
      const result = await dataResponse.json();
      return result;
    } catch (err) {
      console.log(err);
    }
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": DATA_API_KEY,
    },
    body: "",
  };

  type resultSchema = {
    documents: {
      _id: string;
      visitsPerHost: number;
    }[];
  };

  // console.log("connInfo");
  // console.log(context.ip);
  // console.log("type: " + typeof context)
  // console.log("context");
  // console.log(context);

  const hostnameFromAddress = context.ip;
  console.log("req");
  console.log(req);
  console.log("context");
  console.log(context);
  // console.log(connInfo);
  // console.log("is this always the address");
  // console.log(hostnameFromAddress)

  const forwardedHost = req.headers.get("x-forwarded-for") || "";
  const hostnameFromForwarded = forwardedHost.split(",")[0];
  // const host = hostnameFromForwarded != ""
  //   ? hostnameFromForwarded
  //   : "localhost";
  const host = hostnameFromAddress;

  console.log("hostnameFromAddress: " + hostnameFromAddress);
  console.log("hostnameFromForwarded: " + hostnameFromForwarded);

  // console.log("what i was doing before");
  // console.log(host);
  // console.log("hosted from: " + HOSTING_SERVICE);
  await postNewConnection(host);

  const result = await getConnectionRecords() as resultSchema;

  const yourVisits = result.documents.find((x) => x._id === host)
    ?.visitsPerHost;
  const totalVisits = result.documents.map((x) => x.visitsPerHost).reduce((
    a,
    b,
  ) => a + b);

  return new Response(
    `Hello ${host}!\nThis page has been visited ${totalVisits} times. You've visited ${yourVisits} times.\nYou're visiting from ${HOSTING_SERVICE}`,
  );
};

export const config = { path: "/" };
