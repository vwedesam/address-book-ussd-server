const express = require('express')
const { db } = require('./firebase');
const { phoneDB, contactDB } = require('./config');
const app = express()
const port = process.env.PORT || 3000

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

// fetch Contact List
const getContactList = (req) => {
    return db.collection(contactDB).where('userId', '==', req.app.locals.userId)
}
// add new Contact
const addNewContact = (req, contactInfo) => {
    contactInfo.createdAt = Date.now();
    return db.collection(contactDB).add({
        ...contactInfo,
        userId: req.app.locals.userId
    })
}

app.post("/", (req, res, next) => {

    const { phoneNumber, text, serviceCode, sessionId } = req.body;
    let response = "CON \n";
    let contactInfo = [];
    let number = `0${phoneNumber.slice(4)}`;

    // set/add userId to App.locals
    if (text != "2" || text == "1") {
        const dbRef = db.collection(phoneDB).doc(number)
        dbRef.onSnapshot((doc) => {
            if (doc.exists) {
                req.app.locals.userId = doc.data().userId;
                console.log('userId Cached')
            } else {
                response = `END Phone Number ${phoneNumber} not valid on this platform !!! \n`;
                response += `Visit https://address-book-3bb94.web.app to Create An Account !\n`;
            }
        });
    }

    if (text == '') {
        // reset App local
        req.app.locals.userId = null;
        response = "CON Address Book \n"
        response += "-- self service ussd platform -- \n"
        response += "1. Add New Contact \n"
        response += "2. View Contact List \n"
        response += "0. Exit ";
    }
    else if (text == '1') {
        response = "CON Enter Contact Information \n"
        response += "e.g name, email, phoneNumber \n";
    }else if (text == '2') {
        response = "CON select \n"
        response += " 1. Continue \n"
        response += " 0. Exit ";
    }
    else if (text == '2*1') {
        getContactList(req)
            .onSnapshot((snapShot)=>{
                if(snapShot.docs.length > 0){
                    snapShot.docs.forEach((element, index) => {
                        const data = element.data();
                        delete data['userId'];
                        delete data['createdAt'];
                        contactInfo.push(` ${index+1}: ${Object.values(data).join('  ')} \n`);
                    });

                    response = "END Your Contact List \n";
                    response += contactInfo.toString().replace(/,/g, '');
                }
                else {
                    response = "END it Seems your Contact List is Empty \n"
                }
            })
        console.log("get Contact List")
    }
    else {
        //[name, email, phone]
        let newText = text.split(',');
        let textIsValid = false;
        if( newText.length == 3 ) {
            // if phone contains alphabet
            textIsValid = true;
            if( (/[a-zA-Z]/g).test(newText[2]) ){
                response = "END Phone Number is Invalid \n";
                response += "Try again => name, email, phoneNumber \n"
                
                textIsValid = false;
            }
            // simple mail validation
            // test only for '@' 
            if( !((/[@]/g).test(newText[1])) ){
                response = "END email is invalid \n"
                response += "Try again => name, email, phoneNumber \n"
                textIsValid = false;
            }

            if(textIsValid){
                addNewContact(req, { name: newText[0].trim().replace("1*", ''), email: newText[1].trim(), phoneNumber: newText[2].trim()});
                response = "END Congrats !!!\n";
                response += "New Contact was added Successfully \n";
                console.log("Added New Contact")
            }
    
        }else{
            response = "END Invalid Input try again \n";
            response += "Try again => name, email, phoneNumber \n";
        }
    }

    setTimeout(() => {
        console.log(number, text, response)
        return res.send(response);
    }, 2000);
});

function clientErrorHandler(err, req, res, next) {
    console.log(err);
    res.send("END something went wrong try again !!!");
}
app.use(clientErrorHandler)

app.listen(port, () => {
    console.log(`server listening on ${port}`)
})

// module.exports = app;
