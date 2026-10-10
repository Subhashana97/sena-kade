import {useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import logo from './assets/logo.png'
const sb=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY)
const WA=import.meta.env.VITE_WHATSAPP_NUMBER||'94711222446'
const yen=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n)
const unit=p=>Math.round(p.price*(1-(p.discount||0)/100))
const calc=it=>{let sub=0,tax=0;it.forEach(i=>{const l=unit(i)*i.qty;sub+=l;tax+=Math.round(l*i.tax/100)});return{sub,tax,total:sub+tax}}
const orderNo=o=>'SO-'+new Date(o.created_at).getFullYear()+'-'+String(o.id).padStart(4,'0')
const isToday=d=>{const a=new Date(d),b=new Date();return a.toDateString()===b.toDateString()}

function buildWaMessage(o,no){
 const lines=o.items.map(i=>`- ${i.name}  x${i.qty}  @ ${yen(i.price)} = ${yen(i.price*i.qty)}`).join('\n')
 return `NEW ORDER ${no} - Sena Kade\n\n`+
  `Items:\n${lines}\n\n`+
  `Subtotal: ${yen(o.subtotal)}\nTax: ${yen(o.tax)}\nTotal: ${yen(o.total)}\n\n`+
  `Customer: ${o.customer_name}\nMobile: ${o.phone}\nDelivery address: ${o.address||'-'}`
}

function Shop(){
 const [cats,setCats]=useState([]),[prods,setProds]=useState([]),[cat,setCat]=useState(null),[q,setQ]=useState('')
 const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.cart)||[]}catch{return[]}})
 const [open,setOpen]=useState(false),[f,setF]=useState({name:'',phone:'',address:''}),[busy,setBusy]=useState(false)
 useEffect(()=>{sb.from('categories').select('*').order('name').then(r=>setCats(r.data||[]));sb.from('products').select('*').order('name').then(r=>setProds(r.data||[]))},[])
 useEffect(()=>{localStorage.cart=JSON.stringify(cart)},[cart])
 const newArrivals=prods.filter(p=>p.new_arrival)
 const shown=cat==='new'?newArrivals.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())):
  prods.filter(p=>(!cat||p.category_id===cat)&&p.name.toLowerCase().includes(q.toLowerCase()))
 const add=p=>setCart(c=>c.find(i=>i.id===p.id)?c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...c,{...p,qty:1}])
 const chg=(id,n)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:i.qty+n}:i).filter(i=>i.qty>0))
 const t=calc(cart)
 async function confirm(){
  if(!f.name||!f.phone)return alert('Name and mobile number are required')
  setBusy(true)
  const {data,error}=await sb.rpc('place_order',{p_name:f.name,p_phone:f.phone,p_address:f.address,
   p_items:cart.map(i=>({name:i.name,price:unit(i),tax:i.tax,qty:i.qty})),p_sub:t.sub,p_tax:t.tax,p_total:t.total})
  setBusy(false);if(error)return alert(error.message)
  const no=orderNo(data)
  setCart([]);setOpen(false)
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(buildWaMessage(data,no))}`,'_blank')}
 return <>
  <header><img className="logo" src={logo} alt="Sena Kade"/><h1>Sena Kade<small>セナカデー</small></h1>
   <input placeholder="Search items..." value={q} onChange={e=>setQ(e.target.value)}/>
   <button onClick={()=>setOpen(true)}>Basket ({cart.reduce((a,i)=>a+i.qty,0)})</button></header>
  <div className="layout"><aside>
   <div className={!cat?'on':''} onClick={()=>setCat(null)}>All items</div>
   {newArrivals.length>0&&<div className={cat==='new'?'on':''} onClick={()=>setCat('new')}>New Arrivals</div>}
   {cats.map(c=><div key={c.id} className={cat===c.id?'on':''} onClick={()=>setCat(c.id)}>{c.name}</div>)}</aside>
  <main>
   {!cat&&!q&&newArrivals.length>0&&<>
    <div className="section-title">New Arrivals</div>
    <div className="grid" style={{marginBottom:24}}>{newArrivals.map(p=><ProductCard key={p.id} p={p} add={add} chg={chg} qtyInCart={(cart.find(i=>i.id===p.id)||{}).qty||0}/>)}</div>
    <div className="section-title">All Items</div></>}
   {!shown.length&&<p>No items in this category yet.</p>}
   <div className="grid">{shown.map(p=><ProductCard key={p.id} p={p} add={add} chg={chg} qtyInCart={(cart.find(i=>i.id===p.id)||{}).qty||0}/>)}</div></main></div>
  {open&&<div className="drawer"><div className="row"><h3>Your basket</h3><button className="alt" onClick={()=>setOpen(false)}>Close</button></div>
   {!cart.length&&<p>Your basket is empty.</p>}
   {cart.map(i=><div className="row" key={i.id}><span>{i.name}<br/><small>{yen(unit(i))} x {i.qty}</small></span>
    <span><button className="alt" onClick={()=>chg(i.id,-1)}>-</button> {i.qty} <button className="alt" onClick={()=>chg(i.id,1)}>+</button></span></div>)}
   {cart.length>0&&<><hr/><div className="row"><span>Subtotal</span><span>{yen(t.sub)}</span></div><div className="row"><span>Tax</span><span>{yen(t.tax)}</span></div>
   <div className="row"><b>Total</b><b>{yen(t.total)}</b></div>
   <div className="form"><input placeholder="Customer name" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
    <input placeholder="Mobile number" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
    <textarea placeholder="Delivery address" value={f.address} onChange={e=>setF({...f,address:e.target.value})}/>
    <button disabled={busy} onClick={confirm}>Confirm order → WhatsApp</button></div></>}</div>}
 </>}

function ProductCard({p,add,chg,qtyInCart}){
 return <div className="card">
  {p.discount>0&&<span className="badge">-{p.discount}%</span>}
  {p.new_arrival&&<span className="badge new">NEW</span>}
  {p.image_url?<img src={p.image_url} alt={p.name}/>:<div className="ph"/>}
  <b>{p.name}</b><div>{p.discount>0&&<span className="old">{yen(p.price)} </span>}<span className="price">{yen(unit(p))}</span></div>
  <small>Tax {p.tax}% extra</small>
  {!p.available||p.stock<1?<button disabled>Sold out</button>:
   qtyInCart>0?
    <div className="row" style={{margin:0}}>
     <button className="alt" onClick={()=>chg(p.id,-1)}>-</button>
     <b>{qtyInCart}</b>
     <button className="alt" onClick={()=>chg(p.id,1)} disabled={qtyInCart>=p.stock}>+</button>
    </div>
   :<button onClick={()=>add(p)}>Add to basket</button>}
  </div>}

const blank={name:'',price:0,tax:10,discount:0,available:true,new_arrival:false,stock:0,category_id:'',description:'',sku:'',image_url:''}
const statusColor={Pending:'#f6a21e',Confirmed:'#2f8f4e',Delivered:'#223a5e',Cancelled:'#d7263d'}

function Admin(){
 const [user,setUser]=useState(null),[em,setEm]=useState(''),[pw,setPw]=useState(''),[tab,setTab]=useState('d')
 const [cats,setCats]=useState([]),[prods,setProds]=useState([]),[orders,setOrders]=useState([]),[p,setP]=useState(blank),[cn,setCn]=useState(''),[pq,setPq]=useState('')
 useEffect(()=>{sb.auth.getSession().then(r=>setUser(r.data.session?.user||null))},[])
 const load=()=>{sb.from('categories').select('*').order('name').then(r=>setCats(r.data||[]));sb.from('products').select('*').order('id',{ascending:false}).then(r=>setProds(r.data||[]));sb.from('orders').select('*').order('id',{ascending:false}).then(r=>setOrders(r.data||[]))}
 useEffect(()=>{if(user)load()},[user])
 async function login(){const {data,error}=await sb.auth.signInWithPassword({email:em,password:pw});error?alert(error.message):setUser(data.user)}
 async function save(){const {id,created_at,...row}=p;row.category_id=row.category_id||null
  const r=id?await sb.from('products').update(row).eq('id',id):await sb.from('products').insert(row)
  if(r.error)return alert(r.error.message);setP(blank);load()}
 async function quick(x,field,value){await sb.from('products').update({[field]:value}).eq('id',x.id);load()}
 async function upload(e){const file=e.target.files[0];if(!file)return;const path=Date.now()+'-'+file.name.replace(/[^\w.]/g,'_')
  const {error}=await sb.storage.from('products').upload(path,file);if(error)return alert(error.message)
  setP({...p,image_url:sb.storage.from('products').getPublicUrl(path).data.publicUrl})}
 const num=k=>e=>setP({...p,[k]:e.target.value===''?'':Number(e.target.value)})
 if(!user)return <div style={{padding:24,maxWidth:360,margin:'60px auto'}} className="form kv">
  <img src={logo} alt="" width="60" style={{borderRadius:'50%',margin:'0 auto'}}/>
  <h2 style={{textAlign:'center'}}>Sena Kade Admin</h2>
  <input placeholder="Email" value={em} onChange={e=>setEm(e.target.value)}/>
  <input type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)}/>
  <button onClick={login}>Sign in</button></div>

 const low=prods.filter(x=>x.stock<=3)
 const todays=orders.filter(o=>isToday(o.created_at))
 const todaySales=todays.reduce((a,o)=>a+o.total,0)
 const pshown=prods.filter(x=>x.name.toLowerCase().includes(pq.toLowerCase()))

 return <div style={{padding:16}}>
  <div className="tabs">{[['d','Dashboard'],['p','Products'],['c','Categories'],['o','Orders']].map(([k,l])=><button key={k} className={tab===k?'':'alt'} onClick={()=>setTab(k)}>{l}</button>)}
   <button className="alt" onClick={()=>{sb.auth.signOut();setUser(null)}}>Sign out</button></div>

  {tab==='d'&&<>
   <div className="stat-grid">
    <div className="kv"><small>Total Products</small><h2>{prods.length}</h2></div>
    <div className="kv"><small>Total Categories</small><h2>{cats.length}</h2></div>
    <div className="kv"><small>Today's Orders</small><h2>{todays.length}</h2></div>
    <div className="kv"><small>Today's Sales</small><h2>{yen(todaySales)}</h2></div>
    <div className="kv"><small>Low Stock Products</small><h2 style={{color:low.length?'var(--red)':'var(--navy)'}}>{low.length}</h2></div>
   </div>
   <div className="section-title">Low stock (≤3 left)</div>
   <table><thead><tr><th>Item</th><th>Stock</th><th></th></tr></thead><tbody>
    {low.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.stock}</td><td><button className="alt" onClick={()=>{setTab('p');setP(x)}}>Restock</button></td></tr>)}
    {!low.length&&<tr><td colSpan={3}>No low stock items.</td></tr>}
   </tbody></table>
   <div className="section-title" style={{marginTop:18}}>Recent order details</div>
   <table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>
    {orders.slice(0,8).map(o=><tr key={o.id}><td>{orderNo(o)}</td><td>{o.customer_name}<br/><small>{o.phone}</small></td><td>{yen(o.total)}</td>
     <td><span className="chip" style={{background:statusColor[o.status]}}>{o.status}</span></td></tr>)}
   </tbody></table>
  </>}

  {tab==='p'&&<><div className="form kv"><h3>{p.id?'Edit product':'Add new product'}</h3>
   <input placeholder="Item name" value={p.name} onChange={e=>setP({...p,name:e.target.value})}/>
   <input type="number" placeholder="Price (JPY)" value={p.price} onChange={num('price')}/>
   <input type="number" placeholder="Tax %" value={p.tax} onChange={num('tax')}/>
   <input type="number" placeholder="Discount %" value={p.discount} onChange={num('discount')}/>
   <input type="number" placeholder="Stock qty" value={p.stock} onChange={num('stock')}/>
   <select value={p.category_id||''} onChange={e=>setP({...p,category_id:e.target.value?Number(e.target.value):''})}><option value="">No category</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
   <input placeholder="SKU / barcode" value={p.sku||''} onChange={e=>setP({...p,sku:e.target.value})}/>
   <textarea placeholder="Description" value={p.description||''} onChange={e=>setP({...p,description:e.target.value})}/>
   <label><input type="checkbox" checked={p.available} onChange={e=>setP({...p,available:e.target.checked})}/> Available</label>
   <label><input type="checkbox" checked={!!p.new_arrival} onChange={e=>setP({...p,new_arrival:e.target.checked})}/> Mark as New Arrival</label>
   <input type="file" accept="image/*" onChange={upload}/>{p.image_url&&<img src={p.image_url} width="80" alt=""/>}
   <div className="row"><button onClick={save}>{p.id?'Save changes':'Add product'}</button>{p.id&&<button className="alt" onClick={()=>setP(blank)}>Cancel</button>}</div></div>

   <input placeholder="Search products..." value={pq} onChange={e=>setPq(e.target.value)} style={{marginBottom:10,width:'100%',maxWidth:320}}/>
   <table><thead><tr><th>Item</th><th>Price</th><th>Discount</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pshown.map(x=><tr key={x.id}>
    <td>{x.name}{x.new_arrival&&<span className="chip" style={{background:'var(--green)',marginLeft:6}}>NEW</span>}</td>
    <td>{yen(x.price)}</td><td>{x.discount}%</td><td style={{color:x.stock<=3?'var(--red)':'inherit'}}>{x.stock}</td>
    <td>{x.available?<span className="chip" style={{background:'var(--green)'}}>Available</span>:<span className="chip" style={{background:'var(--red)'}}>Unavailable</span>}</td>
    <td><div className="actions">
     <button className="ghost alt" onClick={()=>setP(x)}>Edit</button>
     <button className="ghost alt" onClick={()=>quick(x,'available',!x.available)}>{x.available?'Mark unavailable':'Mark available'}</button>
     <button className="del" onClick={async()=>{if(confirm('Delete this product?')){await sb.from('products').delete().eq('id',x.id);load()}}}>Delete</button>
    </div></td></tr>)}</tbody></table></>}

  {tab==='c'&&<><div className="row kv" style={{justifyContent:'flex-start'}}><input placeholder="New category" value={cn} onChange={e=>setCn(e.target.value)}/><button onClick={async()=>{if(!cn)return;const r=await sb.from('categories').insert({name:cn});if(r.error)return alert(r.error.message);setCn('');load()}}>Add category</button></div>
   <table><tbody>{cats.map(c=><tr key={c.id}><td>{c.name}</td><td><button className="del" onClick={async()=>{if(confirm('Delete category? Its items stay, uncategorised.')){await sb.from('categories').delete().eq('id',c.id);load()}}}>Delete</button></td></tr>)}</tbody></table></>}

  {tab==='o'&&<table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{orderNo(o)}</td><td>{o.customer_name}<br/><small>{o.phone}</small><br/><small>{o.address}</small></td>
   <td>{o.items.map(i=>`${i.name} x${i.qty}`).join(', ')}</td><td>{yen(o.total)}</td>
   <td><select style={{borderColor:statusColor[o.status]}} value={o.status} onChange={async e=>{await sb.from('orders').update({status:e.target.value}).eq('id',o.id);load()}}>{['Pending','Confirmed','Delivered','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table>}
 </div>}

export default function App(){
 const [h,setH]=useState(location.hash);useEffect(()=>{const f=()=>setH(location.hash);addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[])
 return h.startsWith('#/admin')?<Admin/>:<Shop/>}
