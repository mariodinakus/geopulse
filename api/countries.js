import backend from '../server.cjs';
export default function handler(req,res){
  const original=new URL(req.url,'http://localhost');
  req.url='/api/countries'+original.search;
  return backend.handle(req,res);
}
