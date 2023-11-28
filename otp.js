const twilio=require('twilio')

var auth_token='729631fe475a7ee7bb60e8d62e1a24c9'
var sid='ACfbe50ecbb09e12bad95188dfbeed2f73'
var phno='+12512626389'

const client=new twilio(sid,auth_token)


const otp=Math.floor(1000+Math.random()*9000)

client.messages.create({
    from:phno,
    to:"7012917680",
    body:`Your varification code is :${otp}`
}).then(()=>console.log("message sent successfully"))
.catch((err)=>console.log(err))