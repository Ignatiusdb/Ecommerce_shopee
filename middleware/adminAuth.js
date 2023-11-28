// const isLogin= async(req,res,next)=>{
//     try {
//         console.log("islogin")
//         if(req.session.user_id){}

//         else{
//             res.redirect('/admin')
//         }
//         next()
//     } catch (error) {
//         console.log(error.message);
        
//     }
// }

// const isLogout= async(req,res,next)=>{
//     try {
//         console.log("islogout")
//         if(req.session.user_id){
//             res.redirect('/admin/home')
//         }

//         next()
        
//     } catch (error) {
//         console.log(error.message);
        
//     }
// }

// module.exports={
//     isLogin,isLogout
// }
