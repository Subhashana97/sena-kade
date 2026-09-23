import {useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {jsPDF} from 'jspdf'
const sb=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY)
const WA='94711222446'
const yen=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n)
const unit=p=>Math.round(p.price*(1-(p.discount||0)/100))
const calc=it=>{let sub=0,tax=0;it.forEach(i=>{const l=unit(i)*i.qty;sub+=l;tax+=Math.round(l*i.tax/100)});return{sub,tax,total:sub+tax}}
const orderNo=o=>'SO-'+new Date(o.created_at).getFullYear()+'-'+String(o.id).padStart(4,'0')
function makePdf(o){
 const d=new jsPDF(),no=orderNo(o);d.setFontSize(16);d.text('Sales Order '+no,14,18);d.setFontSize(10)
 d.text('Customer: '+o.customer_name+'   Tel: '+o.phone,14,28);d.text('Address: '+(o.address||'-'),14,34)
 let y=46;const head=()=>{d.text('Item',14,y);d.text('Qty',105,y);d.text('Price',125,y);d.text('Tax%',150,y);d.text('Line total',196,y,{align:'right'});y+=8}
 head();o.items.forEach(i=>{if(y>270){d.addPage();y=20;head()}
  d.text(String(i.name).slice(0,45),14,y);d.text(String(i.qty),105,y);d.text(yen(i.price),125,y);d.text(i.tax+'%',150,y);d.text(yen(i.price*i.qty),196,y,{align:'right'});y+=7})
 y+=6;d.text('Subtotal: '+yen(o.subtotal),196,y,{align:'right'});d.text('Tax: '+yen(o.tax),196,y+7,{align:'right'})
 d.setFontSize(13);d.text('Total: '+yen(o.total),196,y+16,{align:'right'});d.save(no+'.pdf');return no}
function Shop(){
 const [cats,setCats]=useState([]),[prods,setProds]=useState([]),[cat,setCat]=useState(null),[q,setQ]=useState('')
 const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.cart)||[]}catch{return[]}})
 const [open,setOpen]=useState(false),[f,setF]=useState({name:'',phone:'',address:''}),[busy,setBusy]=useState(false)
 useEffect(()=>{sb.from('categories').select('*').order('name').then(r=>setCats(r.data||[]));sb.from('products').select('*').order('name').then(r=>setProds(r.data||[]))},[])
 useEffect(()=>{localStorage.cart=JSON.stringify(cart)},[cart])
 const shown=prods.filter(p=>(!cat||p.category_id===cat)&&p.name.toLowerCase().includes(q.toLowerCase()))
 const add=p=>setCart(c=>c.find(i=>i.id===p.id)?c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...c,{...p,qty:1}])
 const chg=(id,n)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:i.qty+n}:i).filter(i=>i.qty>0))
 const t=calc(cart)
 async function confirm(){
  if(!f.name||!f.phone)return alert('Name and phone number are required')
  setBusy(true)
  const {data,error}=await sb.from('orders').insert({customer_name:f.name,phone:f.phone,address:f.address,items:cart.map(i=>({name:i.name,price:unit(i),tax:i.tax,qty:i.qty})),subtotal:t.sub,tax:t.tax,total:t.total}).select().single()
  setBusy(false);if(error)return alert(error.message)
  const no=makePdf({...data});setCart([]);setOpen(false)
  const msg=`Hello! New order ${no}\nName: ${f.name}\nPhone: ${f.phone}\nTotal: ${yen(t.total)} (tax incl.)\nI am attaching the order PDF.`
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`,'_blank')}
 return <>
  <header><h1>Fresh Mart</h1><input placeholder="Search items" value={q} onChange={e=>setQ(e.target.value)}/><button onClick={()=>setOpen(true)}>Basket ({cart.reduce((a,i)=>a+i.qty,0)})</button></header>
  <div className="layout"><aside><div className={!cat?'on':''} onClick={()=>setCat(null)}>All items</div>
   {cats.map(c=><div key={c.id} className={cat===c.id?'on':''} onClick={()=>setCat(c.id)}>{c.name}</div>)}</aside>
  <main>{!shown.length&&<p>No items in this category yet.</p>}<div className="grid">{shown.map(p=><div className="card" key={p.id}>
   {p.discount>0&&<span className="badge">-{p.discount}%</span>}{p.image_url?<img src={p.image_url} alt={p.name}/>:<div className="ph"/>}
   <b>{p.name}</b><div>{p.discount>0&&<span className="old">{yen(p.price)} </span>}<span className="price">{yen(unit(p))}</span></div>
   <small>Tax {p.tax}% extra</small>
   <button disabled={!p.available||p.stock<1} onClick={()=>add(p)}>{p.available&&p.stock>0?'Add to basket':'Sold out'}</button></div>)}</div></main></div>
  {open&&<div className="drawer"><div className="row"><h3>Your basket</h3><button className="alt" onClick={()=>setOpen(false)}>Close</button></div>
   {!cart.length&&<p>Your basket is empty.</p>}
   {cart.map(i=><div className="row" key={i.id}><span>{i.name}<br/><small>{yen(unit(i))} x {i.qty}</small></span>
    <span><button className="alt" onClick={()=>chg(i.id,-1)}>-</button> {i.qty} <button className="alt" onClick={()=>chg(i.id,1)}>+</button></span></div>)}
   {cart.length>0&&<><hr/><div className="row"><span>Subtotal</span><span>{yen(t.sub)}</span></div><div className="row"><span>Tax</span><span>{yen(t.tax)}</span></div>
   <div className="row"><b>Total</b><b>{yen(t.total)}</b></div>
   <div className="form"><input placeholder="Your name" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
    <input placeholder="Phone" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
    <textarea placeholder="Address / note" value={f.address} onChange={e=>setF({...f,address:e.target.value})}/>
    <button disabled={busy} onClick={confirm}>Confirm order</button></div></>}</div>}
 </>}
const blank={name:'',price:0,tax:10,discount:0,available:true,stock:0,category_id:'',description:'',sku:'',image_url:''}
function Admin(){
 const [user,setUser]=useState(null),[em,setEm]=useState(''),[pw,setPw]=useState(''),[tab,setTab]=useState('p')
 const [cats,setCats]=useState([]),[prods,setProds]=useState([]),[orders,setOrders]=useState([]),[p,setP]=useState(blank),[cn,setCn]=useState('')
 useEffect(()=>{sb.auth.getSession().then(r=>setUser(r.data.session?.user||null))},[])
 const load=()=>{sb.from('categories').select('*').order('name').then(r=>setCats(r.data||[]));sb.from('products').select('*').order('id',{ascending:false}).then(r=>setProds(r.data||[]));sb.from('orders').select('*').order('id',{ascending:false}).then(r=>setOrders(r.data||[]))}
 useEffect(()=>{if(user)load()},[user])
 async function login(){const {data,error}=await sb.auth.signInWithPassword({email:em,password:pw});error?alert(error.message):setUser(data.user)}
 async function save(){const {id,created_at,...row}=p;row.category_id=row.category_id||null
  const r=id?await sb.from('products').update(row).eq('id',id):await sb.from('products').insert(row)
  if(r.error)return alert(r.error.message);setP(blank);load()}
 async function upload(e){const file=e.target.files[0];if(!file)return;const path=Date.now()+'-'+file.name.replace(/[^\w.]/g,'_')
  const {error}=await sb.storage.from('products').upload(path,file);if(error)return alert(error.message)
  setP({...p,image_url:sb.storage.from('products').getPublicUrl(path).data.publicUrl})}
 const num=k=>e=>setP({...p,[k]:e.target.value===''?'':Number(e.target.value)})
 if(!user)return <div style={{padding:24}} className="form"><h2>Admin login</h2><input placeholder="Email" value={em} onChange={e=>setEm(e.target.value)}/><input type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)}/><button onClick={login}>Sign in</button></div>
 return <div style={{padding:16}}><div className="tabs">{[['p','Items'],['c','Categories'],['o','Orders']].map(([k,l])=><button key={k} className={tab===k?'':'alt'} onClick={()=>setTab(k)}>{l}</button>)}
  <button className="alt" onClick={()=>{sb.auth.signOut();setUser(null)}}>Sign out</button></div>
  {tab==='p'&&<><div className="form"><h3>{p.id?'Edit item':'New item'}</h3>
   <input placeholder="Item name" value={p.name} onChange={e=>setP({...p,name:e.target.value})}/>
   <input type="number" placeholder="Price (JPY)" value={p.price} onChange={num('price')}/>
   <input type="number" placeholder="Tax %" value={p.tax} onChange={num('tax')}/>
   <input type="number" placeholder="Discount %" value={p.discount} onChange={num('discount')}/>
   <input type="number" placeholder="Stock qty" value={p.stock} onChange={num('stock')}/>
   <select value={p.category_id||''} onChange={e=>setP({...p,category_id:e.target.value?Number(e.target.value):''})}><option value="">No category</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
   <input placeholder="SKU / barcode" value={p.sku||''} onChange={e=>setP({...p,sku:e.target.value})}/>
   <textarea placeholder="Description" value={p.description||''} onChange={e=>setP({...p,description:e.target.value})}/>
   <label><input type="checkbox" checked={p.available} onChange={e=>setP({...p,available:e.target.checked})}/> Available</label>
   <input type="file" accept="image/*" onChange={upload}/>{p.image_url&&<img src={p.image_url} width="80" alt=""/>}
   <div className="row"><button onClick={save}>Save item</button>{p.id&&<button className="alt" onClick={()=>setP(blank)}>Cancel</button>}</div></div>
   <table><thead><tr><th>Item</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>{prods.map(x=><tr key={x.id}><td>{x.name}</td><td>{yen(x.price)}</td><td>{x.stock}</td>
    <td><button className="alt" onClick={()=>setP(x)}>Edit</button> <button className="del" onClick={async()=>{if(confirm('Delete this item?')){await sb.from('products').delete().eq('id',x.id);load()}}}>Delete</button></td></tr>)}</tbody></table></>}
  {tab==='c'&&<><div className="row" style={{justifyContent:'flex-start'}}><input placeholder="New category" value={cn} onChange={e=>setCn(e.target.value)}/><button onClick={async()=>{if(!cn)return;const r=await sb.from('categories').insert({name:cn});if(r.error)return alert(r.error.message);setCn('');load()}}>Add category</button></div>
   <table><tbody>{cats.map(c=><tr key={c.id}><td>{c.name}</td><td><button className="del" onClick={async()=>{if(confirm('Delete category? Its items stay, uncategorised.')){await sb.from('categories').delete().eq('id',c.id);load()}}}>Delete</button></td></tr>)}</tbody></table></>}
  {tab==='o'&&<table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{orderNo(o)}</td><td>{o.customer_name}<br/><small>{o.phone}</small></td><td>{yen(o.total)}</td>
   <td><select value={o.status} onChange={async e=>{await sb.from('orders').update({status:e.target.value}).eq('id',o.id);load()}}>{['Pending','Confirmed','Delivered','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></td>
   <td><button className="alt" onClick={()=>makePdf(o)}>PDF</button></td></tr>)}</tbody></table>}
 </div>}
export default function App(){
 const [h,setH]=useState(location.hash);useEffect(()=>{const f=()=>setH(location.hash);addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[])
 return h.startsWith('#/admin')?<Admin/>:<Shop/>}
