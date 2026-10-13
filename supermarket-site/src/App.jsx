import {useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import logo from './assets/logo.png'
const sb=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY)
const WA=import.meta.env.VITE_WHATSAPP_NUMBER||'817086901215'
const yen=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).format(n)
const unit=p=>Math.round(p.price*(1-(p.discount||0)/100))
const calc=it=>{let sub=0,tax=0;it.forEach(i=>{const l=unit(i)*i.qty;sub+=l;tax+=Math.round(l*i.tax/100)});return{sub,tax,total:sub+tax}}
const orderNo=o=>'SO-'+new Date(o.created_at).getFullYear()+'-'+String(o.id).padStart(4,'0')
const isToday=d=>{const a=new Date(d),b=new Date();return a.toDateString()===b.toDateString()}

function buildWaMessage(o,no){
 const lines=o.items.map((i,n)=>`${n+1}. ${i.name}  x${i.qty}  @ ${yen(i.price)} = ${yen(i.price*i.qty)}`).join('\n')
 return `NEW ORDER ${no} - Sena Kade\n\n`+
  `Items:\n${lines}\n\n`+
  `Subtotal: ${yen(o.subtotal)}\nTax: ${yen(o.tax)}\nTotal: ${yen(o.total)}\n\n`+
  `Customer: ${o.customer_name}\nMobile: ${o.phone}\n`+
  `Postal code: ${o.postal_code||'-'}\nDelivery address: ${o.address||'-'}\n`+
  `Delivery date: ${o.delivery_date||'-'}\nDelivery time: ${o.delivery_time||'-'}`+
  (o.order_note?`\n\nNote: ${o.order_note}`:'')
}

const blankForm={name:'',phone:'',address:'',delivery_date:'',delivery_time:'',postal1:'',postal2:'',note:''}
const TIME_SLOTS=['9-12','12-14','14-16','16-18','18-20','19-11']

function Shop(){
 const [cats,setCats]=useState([]),[prods,setProds]=useState([]),[cat,setCat]=useState(null),[q,setQ]=useState('')
 const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.cart)||[]}catch{return[]}})
 const [open,setOpen]=useState(false),[f,setF]=useState(blankForm),[busy,setBusy]=useState(false)
 const [showTop,setShowTop]=useState(false)
 useEffect(()=>{sb.from('categories').select('*').order('name').then(r=>setCats(r.data||[]));sb.from('products').select('*').order('name').then(r=>setProds(r.data||[]))},[])
 useEffect(()=>{localStorage.cart=JSON.stringify(cart)},[cart])
 useEffect(()=>{const f=()=>setShowTop(window.scrollY>400);addEventListener('scroll',f);return()=>removeEventListener('scroll',f)},[])
 const newArrivals=prods.filter(p=>p.new_arrival)
 const shown=cat==='new'?newArrivals.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())):
  prods.filter(p=>(!cat||p.category_id===cat)&&p.name.toLowerCase().includes(q.toLowerCase()))
 const add=(p,n=1)=>setCart(c=>c.find(i=>i.id===p.id)?c.map(i=>i.id===p.id?{...i,qty:i.qty+n}:i):[...c,{...p,qty:n}])
 const chg=(id,n)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:i.qty+n}:i).filter(i=>i.qty>0))
 const t=calc(cart)
 async function confirm(){
  if(!f.name||!f.phone)return alert('Name and mobile number are required')
  if(!/^\d{3}$/.test(f.postal1)||!/^\d{4}$/.test(f.postal2))return alert('Please enter a valid postal code (3 digits + 4 digits)')
  if(!f.delivery_date)return alert('Please choose a delivery date')
  if(!f.delivery_time)return alert('Please choose a delivery time slot')
  // iOS Safari: open the window synchronously inside the click, BEFORE any await
  const wa=window.open('','_blank')
  if(wa)wa.document.write('<p style="font-family:sans-serif;text-align:center;margin-top:40vh">Placing your order...</p>')
  setBusy(true)
  const postal=`${f.postal1}-${f.postal2}`
  const {data,error}=await sb.rpc('place_order',{p_name:f.name,p_phone:f.phone,p_address:f.address,
   p_items:cart.map(i=>({name:i.name,price:unit(i),tax:i.tax,qty:i.qty})),p_sub:t.sub,p_tax:t.tax,p_total:t.total,
   p_delivery_date:f.delivery_date,p_delivery_time:f.delivery_time,p_postal_code:postal,p_note:f.note})
  setBusy(false)
  if(error){if(wa)wa.close();return alert(error.message)}
  const no=orderNo(data)
  const url=`https://wa.me/${WA}?text=${encodeURIComponent(buildWaMessage(data,no))}`
  setCart([]);setOpen(false);setF(blankForm)
  if(wa)wa.location.href=url
  else window.location.href=url}
 return <>
  <header>
   <img className="logo" src={logo} alt="Sena Kade" style={{cursor:'pointer'}} onClick={()=>{setCat(null);setQ('')}}/>
   <h1 style={{cursor:'pointer'}} onClick={()=>{setCat(null);setQ('')}}>Sena Kade<small>セナカデー</small></h1>
   <input placeholder="Search items..." value={q} onChange={e=>setQ(e.target.value)}/>
   <button onClick={()=>setOpen(true)}>Basket ({cart.reduce((a,i)=>a+i.qty,0)})</button></header>
  <div className="layout"><aside>
   <div className={!cat?'on':''} onClick={()=>{setCat(null);setQ('')}}>All items</div>
   {newArrivals.length>0&&<div className={cat==='new'?'on':''} onClick={()=>setCat('new')}>New Arrivals</div>}
   {cats.map(c=><div key={c.id} className={cat===c.id?'on':''} onClick={()=>setCat(c.id)}>{c.name}</div>)}</aside>
  <main>
   {!cat&&!q&&newArrivals.length>0&&<>
    <div className="section-title">New Arrivals</div>
    <div className="grid" style={{marginBottom:24}}>{newArrivals.map(p=><ProductCard key={p.id} p={p} add={add} qtyInCart={(cart.find(i=>i.id===p.id)||{}).qty||0}/>)}</div>
    <div className="section-title">All Items</div></>}
   {!shown.length&&<p>No items in this category yet.</p>}
   <div className="grid">{shown.map(p=><ProductCard key={p.id} p={p} add={add} qtyInCart={(cart.find(i=>i.id===p.id)||{}).qty||0}/>)}</div></main></div>
  {showTop&&<button className="back-to-top" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} aria-label="Back to top">↑</button>}
  {open&&<div className="drawer"><div className="row"><h3>Your basket</h3><button className="alt" onClick={()=>setOpen(false)}>Close</button></div>
   {!cart.length&&<p>Your basket is empty.</p>}
   {cart.map(i=><div className="row" key={i.id}><span>{i.name}<br/><small>{yen(unit(i))} x {i.qty}</small></span>
    <span><button className="alt" onClick={()=>chg(i.id,-1)}>-</button> {i.qty} <button className="alt" onClick={()=>chg(i.id,1)}>+</button></span></div>)}
   {cart.length>0&&<><hr/><div className="row"><span>Subtotal</span><span>{yen(t.sub)}</span></div><div className="row"><span>Tax</span><span>{yen(t.tax)}</span></div>
   <div className="row"><b>Total</b><b>{yen(t.total)}</b></div>
   <div className="form"><input placeholder="Customer name" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
    <input placeholder="Mobile number" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
    <div><small style={{fontWeight:700,color:'var(--navy)'}}>Postal code</small>
     <div className="row" style={{margin:0,justifyContent:'flex-start',gap:6}}>
      <input inputMode="numeric" maxLength={3} placeholder="123" value={f.postal1} onChange={e=>setF({...f,postal1:e.target.value.replace(/\D/g,'').slice(0,3)})} style={{width:70,textAlign:'center'}}/>
      <b>-</b>
      <input inputMode="numeric" maxLength={4} placeholder="4567" value={f.postal2} onChange={e=>setF({...f,postal2:e.target.value.replace(/\D/g,'').slice(0,4)})} style={{width:80,textAlign:'center'}}/>
     </div></div>
    <textarea placeholder="Delivery address" value={f.address} onChange={e=>setF({...f,address:e.target.value})}/>
    <div><small style={{fontWeight:700,color:'var(--navy)'}}>Delivery date</small>
     <input type="date" min={new Date().toISOString().slice(0,10)} value={f.delivery_date} onChange={e=>setF({...f,delivery_date:e.target.value})} style={{width:'100%'}}/></div>
    <div><small style={{fontWeight:700,color:'var(--navy)'}}>Delivery time slot</small>
     <select value={f.delivery_time} onChange={e=>setF({...f,delivery_time:e.target.value})} style={{width:'100%'}}>
      <option value="">Select a time slot</option>
      {TIME_SLOTS.map(s=><option key={s} value={s}>{s}</option>)}
     </select></div>
    <textarea placeholder="Note for this order (optional)" value={f.note} onChange={e=>setF({...f,note:e.target.value})}/>
    <button disabled={busy} onClick={confirm}>Confirm order → WhatsApp</button></div></>}</div>}
 </>}

function ProductCard({p,add,qtyInCart}){
 const [sel,setSel]=useState(1)
 const maxSel=Math.max(0,p.stock-qtyInCart)
 return <div className="card">
  {p.discount>0&&<span className="badge">-{p.discount}%</span>}
  {p.new_arrival&&<span className="badge new">NEW</span>}
  {p.image_url?<img src={p.image_url} alt={p.name}/>:<div className="ph"/>}
  <b>{p.name}</b><div>{p.discount>0&&<span className="old">{yen(p.price)} </span>}<span className="price">{yen(unit(p))}</span></div>
  <small>Tax {p.tax}% extra{qtyInCart>0?` • ${qtyInCart} in basket`:''}</small>
  {!p.available||p.stock<1?<button disabled>Sold out</button>:<>
   <div className="row" style={{margin:0}}>
    <button className="alt" onClick={()=>setSel(n=>Math.max(1,n-1))}>-</button>
    <b>{sel}</b>
    <button className="alt" onClick={()=>setSel(n=>Math.min(maxSel||1,n+1))} disabled={sel>=maxSel}>+</button>
   </div>
   <button disabled={maxSel<1} onClick={()=>{add(p,sel);setSel(1)}}>{maxSel<1?'Sold out':'Add to basket'}</button>
  </>}
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
    {orders.slice(0,8).map(o=><tr key={o.id}><td><a href={'#/invoice/'+o.id} target="_blank" rel="noopener" style={{color:'var(--pink)',fontWeight:700,textDecoration:'underline'}}>{orderNo(o)}</a></td><td>{o.customer_name}<br/><small>{o.phone}</small></td><td>{yen(o.total)}</td>
     <td><span className="chip" style={{background:statusColor[o.status]}}>{o.status}</span></td></tr>)}
   </tbody></table>
  </>}

  {tab==='p'&&<><div className="form kv"><h3>{p.id?'Edit product':'Add new product'}</h3>
   <div><small style={{fontWeight:700,color:'var(--navy)'}}>Item name</small><input placeholder="e.g. Araliya Sudu Kekulu - 5Kg" value={p.name} onChange={e=>setP({...p,name:e.target.value})}/></div>
   <div><small style={{fontWeight:700,color:'var(--navy)'}}>Price (JPY)</small><input type="number" value={p.price} onChange={num('price')}/></div>
   <div><small style={{fontWeight:700,color:'var(--navy)'}}>Tax %</small><input type="number" value={p.tax} onChange={num('tax')}/></div>
   <div><small style={{fontWeight:700,color:'var(--navy)'}}>Discount %</small><input type="number" value={p.discount} onChange={num('discount')}/></div>
   <div><small style={{fontWeight:700,color:'var(--navy)'}}>Stock quantity</small><input type="number" value={p.stock} onChange={num('stock')}/></div>
   <div><small style={{fontWeight:700,color:'var(--navy)'}}>Category</small>
    <select value={p.category_id||''} onChange={e=>setP({...p,category_id:e.target.value?Number(e.target.value):''})}><option value="">No category</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
   <div><small style={{fontWeight:700,color:'var(--navy)'}}>SKU / barcode</small><input value={p.sku||''} onChange={e=>setP({...p,sku:e.target.value})}/></div>
   <div><small style={{fontWeight:700,color:'var(--navy)'}}>Description</small><textarea value={p.description||''} onChange={e=>setP({...p,description:e.target.value})}/></div>
   <label><input type="checkbox" checked={p.available} onChange={e=>setP({...p,available:e.target.checked})}/> Available</label>
   <label><input type="checkbox" checked={!!p.new_arrival} onChange={e=>setP({...p,new_arrival:e.target.checked})}/> Mark as New Arrival</label>
   <div><small style={{fontWeight:700,color:'var(--navy)'}}>Product image</small><input type="file" accept="image/*" onChange={upload}/>{p.image_url&&<img src={p.image_url} width="80" alt="" style={{display:'block',marginTop:6}}/>}</div>
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

  {tab==='o'&&<table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}>
   <td><a href={'#/invoice/'+o.id} target="_blank" rel="noopener" style={{color:'var(--pink)',fontWeight:700,textDecoration:'underline',cursor:'pointer'}}>{orderNo(o)}</a></td>
   <td>{o.customer_name}<br/><small>{o.phone}</small><br/><small>〒{o.postal_code||'-'} {o.address}</small><br/><small>Delivery: {o.delivery_date||'-'} {o.delivery_time||''}</small>{o.order_note&&<><br/><small>Note: {o.order_note}</small></>}</td>
   <td>{o.items.map(i=>`${i.name} x${i.qty}`).join(', ')}</td><td>{yen(o.total)}</td>
   <td><select style={{borderColor:statusColor[o.status]}} value={o.status} onChange={async e=>{await sb.from('orders').update({status:e.target.value}).eq('id',o.id);load()}}>{['Pending','Confirmed','Delivered','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table>}
 </div>}

function Invoice(){
 const id=location.hash.split('/')[2]
 const [o,setO]=useState(null),[err,setErr]=useState(''),[loading,setLoading]=useState(true)
 useEffect(()=>{
  sb.from('orders').select('*').eq('id',id).single().then(r=>{
   setLoading(false)
   if(r.error||!r.data){setErr('Could not load this order. You may need to be signed in as admin.');return}
   setO(r.data)
  })
 },[id])
 if(loading)return <div style={{padding:40,fontFamily:'Poppins,sans-serif'}}>Loading invoice...</div>
 if(err)return <div style={{padding:40,fontFamily:'Poppins,sans-serif'}}>{err}<br/><a href="#/admin">Go to admin login</a></div>
 const no=orderNo(o)
 const date=new Date(o.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
 return <div style={{maxWidth:800,margin:'0 auto',padding:'36px 40px',fontFamily:"'Poppins',Arial,sans-serif",color:'#1a1a1a',background:'#fff'}}>
  <style>{'@media print{.no-print{display:none}} body{background:#fff}'}</style>
  <div className="no-print" style={{textAlign:'right',marginBottom:16}}>
   <button onClick={()=>window.print()}>Print / Save as PDF</button>
  </div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'3px solid #172a45',paddingBottom:18,marginBottom:24}}>
   <div><img src={logo} alt="Sena Kade" width="56" style={{borderRadius:'50%'}}/>
    <h2 style={{margin:'8px 0 0',color:'#172a45'}}>Sena Kade</h2>
    <small style={{color:'#666'}}>Shizuoka, Japan</small></div>
   <div style={{textAlign:'right'}}>
    <h1 style={{margin:0,letterSpacing:2,color:'#172a45'}}>INVOICE</h1>
    <div style={{marginTop:6,fontSize:14}}><b>Invoice No:</b> {no}</div>
    <div style={{fontSize:14}}><b>Date:</b> {date}</div>
    <div style={{fontSize:14}}><b>Status:</b> {o.status}</div>
   </div>
  </div>
  <div style={{display:'flex',justifyContent:'space-between',marginBottom:24}}>
   <div><small style={{color:'#888',fontWeight:700}}>BILL TO</small>
    <div style={{fontSize:15,marginTop:4}}><b>{o.customer_name}</b><br/>{o.phone}<br/>{'〒'}{o.postal_code||'-'}&nbsp; {o.address||'-'}</div></div>
   <div style={{textAlign:'right'}}><small style={{color:'#888',fontWeight:700}}>DELIVERY</small>
    <div style={{fontSize:15,marginTop:4}}>{o.delivery_date||'-'}<br/>{o.delivery_time||'-'}</div></div>
  </div>
  <table style={{width:'100%',borderCollapse:'collapse',marginBottom:20}}>
   <thead><tr style={{background:'#172a45',color:'#fff'}}>
    <th style={{padding:'8px 10px',textAlign:'left'}}>#</th>
    <th style={{padding:'8px 10px',textAlign:'left'}}>Description</th>
    <th style={{padding:'8px 10px',textAlign:'right'}}>Qty</th>
    <th style={{padding:'8px 10px',textAlign:'right'}}>Unit Price</th>
    <th style={{padding:'8px 10px',textAlign:'right'}}>Tax</th>
    <th style={{padding:'8px 10px',textAlign:'right'}}>Amount</th>
   </tr></thead>
   <tbody>{o.items.map((i,n)=><tr key={n} style={{borderBottom:'1px solid #e5e5e5'}}>
    <td style={{padding:'8px 10px'}}>{n+1}</td>
    <td style={{padding:'8px 10px'}}>{i.name}</td>
    <td style={{padding:'8px 10px',textAlign:'right'}}>{i.qty}</td>
    <td style={{padding:'8px 10px',textAlign:'right'}}>{yen(i.price)}</td>
    <td style={{padding:'8px 10px',textAlign:'right'}}>{i.tax}%</td>
    <td style={{padding:'8px 10px',textAlign:'right'}}>{yen(i.price*i.qty)}</td>
   </tr>)}</tbody>
  </table>
  <div style={{display:'flex',justifyContent:'flex-end'}}>
   <table style={{minWidth:260}}><tbody>
    <tr><td style={{padding:'4px 10px'}}>Subtotal</td><td style={{padding:'4px 10px',textAlign:'right'}}>{yen(o.subtotal)}</td></tr>
    <tr><td style={{padding:'4px 10px'}}>Tax</td><td style={{padding:'4px 10px',textAlign:'right'}}>{yen(o.tax)}</td></tr>
    <tr style={{borderTop:'2px solid #172a45',fontWeight:700,fontSize:17}}><td style={{padding:'8px 10px'}}>Total (JPY)</td><td style={{padding:'8px 10px',textAlign:'right'}}>{yen(o.total)}</td></tr>
   </tbody></table>
  </div>
  {o.order_note&&<div style={{marginBottom:20,padding:'10px 14px',background:'#fff8ee',borderRadius:8,fontSize:13}}><b>Note:</b> {o.order_note}</div>}
  <div style={{marginTop:40,paddingTop:16,borderTop:'1px solid #e5e5e5',fontSize:12,color:'#888',textAlign:'center'}}>
   Thank you for shopping with Sena Kade. This is a computer-generated invoice.
  </div>
 </div>}

export default function App(){
 const [h,setH]=useState(location.hash);useEffect(()=>{const f=()=>setH(location.hash);addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[])
 if(h.startsWith('#/invoice/'))return <Invoice/>
 return h.startsWith('#/admin')?<Admin/>:<Shop/>}
