// Public artwork origin only. Secrets (Oracle access keys) remain server-side.
const RE=/^[a-zA-Z0-9._-]+$/;
export default function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}
 const {OCI_REGION:region,OCI_NAMESPACE:namespace,OCI_BUCKET:bucket}=process.env;
 if(!region||!namespace||!bucket||![region,namespace,bucket].every(x=>RE.test(x)))return res.status(503).json({error:'Oracle public assets not configured'});
 res.setHeader('Cache-Control','public, max-age=1800, s-maxage=86400');
 return res.status(200).json({base:`https://objectstorage.${region}.oraclecloud.com/n/${namespace}/b/${bucket}/o/`});
}
