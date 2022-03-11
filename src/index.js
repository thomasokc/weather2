///// -Firebase Imports- /////

import { initializeApp } from 'firebase/app'
    // Firestore Imports
    import {
        getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc,
        query, where, orderBy, serverTimestamp, getDocs, updateDoc
    } from 'firebase/firestore'

    // Firebase auth imports
    import { 
        getAuth, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword,
        onAuthStateChanged, GoogleAuthProvider, signInWithPopup
    } from 'firebase/auth'

///// -Leaflet Mapping- /////

$(document).ready(function() {
  
    $('#mapid').height(window.innerHeight);
    $('#slide-in').height(window.innerHeight);

    $(document).on('click','#advanced',function() {
      if($('#slide-in').hasClass('in')) {
        $('#slide-in').removeClass('in')
      } else {
        $('#slide-in').addClass('in')
      }
    });

    var map = L.map('mapid', {
      zoomControl : false
    }).setView([33,-39], 3);

    var tiles = L.tileLayer('https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);


    // Get location from user
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
            L.circle([position.coords.latitude, position.coords.longitude], {radius: 7000}).addTo(map);
            map.setView([position.coords.latitude, position.coords.longitude],10)
        });
    } else {
        console.log('You dont have geolocation');
    }

    var drip = L.tileLayer('https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?&opacity=1&appid=e81870f85fb21dd138c1e9f3b0dbed70', {
        opacity: 1,

    }).addTo(map);    


///// -Weather- /////

    let weather = {
        apiKey: "e81870f85fb21dd138c1e9f3b0dbed70",  // Hide API key in some sort of back end if I further this project

        fetchCityWeather: function (city) {
            fetch("https://api.openweathermap.org/data/2.5/weather?q=" + city + "&units=imperial&appid=" + this.apiKey)
            .then((response) => response.json())
            .then((data) => {
                this.displayWeather(data);
                console.log(data.coord.lon)
                map.setView([data.coord.lat,data.coord.lon],6)
            })
        },

        

        fetchLocationWeather: function (position) {

            if ('geolocation' in navigator) {
                console.log('geolocation available');
                navigator.geolocation.getCurrentPosition(position =>  {

                fetch("https://api.openweathermap.org/data/2.5/weather?lat=" + position.coords.latitude + "&lon=" + position.coords.longitude + "&units=imperial&appid=" + this.apiKey)
                .then((response) => response.json())
                .then((data) => this.displayWeather(data));
                map.setView([position.coords.latitude,position.coords.longitude],6)
            });
            } else {
                console.log('geolocation not available');
            }

            
        },

        displayWeather: function(data) {
            
            const { name } = data;
            const { icon, description } = data.weather[0];
            const {temp,temp_min,temp_max, humidity } = data.main;
            const { speed } = data.wind;
            console.log(name,icon,description,temp,temp_min,temp_max,humidity,speed)
            document.querySelector(".city").innerText = "Weather in: " + name;
            document.querySelector(".icon").src =
            "https://openweathermap.org/img/wn/" + icon + "@2x.png";
            document.querySelector(".description").innerText = "Forecast: " + description;
            document.querySelector(".temp").innerText = "Current: " + temp + " °F";
            document.querySelector(".temp_min").innerText = "Low: " + temp_min + " °F";
            document.querySelector(".temp_max").innerText = "High: " + temp_max + " °F";
            document.querySelector(".humidity").innerText = "Humidity: " + humidity + "%";
            document.querySelector(".wind").innerText = "Wind speed: " + speed + "mph"
        },

        searchCity: function () {
            this.fetchCityWeather(document.querySelector(".search-bar").value);
        },

        searchLocation: function () {
            this.fetchLocationWeather(document.querySelector(".sl"));
        }
    };

    document.querySelector(".sc button").addEventListener("click", function () { weather.searchCity();})

    document.querySelector(".sl button").addEventListener("click", function () { weather.searchLocation();})


    ///// -Firebase- /////

    

    const firebaseConfig = {
        apiKey: "AIzaSyDljNeS0q4-0BFxlFsjD2sutP73234NHxo",
        authDomain: "weatherapp-d5b39.firebaseapp.com",
        projectId: "weatherapp-d5b39",
        storageBucket: "weatherapp-d5b39.appspot.com",
        messagingSenderId: "331557784599",
        appId: "1:331557784599:web:967255858b9d942de86052"
    };

    // init app
    initializeApp(firebaseConfig)

    // init services
    const db = getFirestore()
    const auth = getAuth();

    // User auth check
    const whenSignedIn = document.getElementById('whenSignedIn');
    const whenSignedOut = document.getElementById('whenSignedOut');

    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');

    const userDetails = document.getElementById('userDetails');

    const provider = new GoogleAuthProvider();

    signInBtn.onclick = () => signInWithPopup(auth, provider)
    .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;
        // The signed-in user info.
        const user = result.user;
        // ...
    }).catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        const email = error.email;
        // The AuthCredential type that was used.
        const credential = GoogleAuthProvider.credentialFromError(error);
        // ...
    });

    /// Sign in event handlers

    auth.onAuthStateChanged(user => {
        if (user) {
            // signed in
            whenSignedIn.hidden = false;
            whenSignedOut.hidden = true;
            userDetails.innerHTML = `<h3>Hello ${user.displayName}!</h3> <p>User ID: ${user.uid}</p>`;
        } else {
            // not signed in
            whenSignedIn.hidden = true;
            whenSignedOut.hidden = false;
            //userDetails.innerHTML = '';
        }
    });

    // Collection ref
    const colRef = collection(db, 'locations')

    // queries sorted by time they are created
    const q = query(colRef, orderBy('createdAt'))

    // Get collection data
    const unsubCol = onSnapshot(q, (snapshot) => {
        let locations = []
        snapshot.docs.forEach((doc) => {
            locations.push({ ...doc.data(), id: doc.id })
        })
        console.log(locations)
    })

    // Add city
    const addCityForm = document.querySelector('.add')
    addCityForm.addEventListener('submit', (e) => {
        e.preventDefault()

        addDoc(colRef, {
            city: addCityForm.city.value,
            createdAt: serverTimestamp()
        })
        .then(() => {
            addCityForm.reset() // Resets the input form once submitted
        })
    })


    // Delete city 
    const deleteCityForm = document.querySelector('.delete')
    deleteCityForm.addEventListener('submit', (e) => {
        e.preventDefault()

        const docRef = doc(db, 'locations', deleteCityForm.id.value)

        deleteDoc(docRef).then(() => {
            deleteCityForm.reset()
        })
    })

    // Get a single doc
    const docRef = doc(db, 'locations', "OrfjFTiJxcUBr8v0qNyJ")

    const unsubDoc = onSnapshot(docRef, (doc) => {
        console.log(doc.data(), doc.id)
    })



    // Sign up
    const signupForm = document.querySelector('.signup')
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault()

        const email = signupForm.email.value
        const password = signupForm.password.value

        createUserWithEmailAndPassword(auth, email, password).then((cred) => {
            //console.log('user created:', cred.user)
            signupForm.reset()
        })
        .catch((err) => {
            console.log(err.message)
        })
    })

    // Log in and out
    const logoutButton = document.querySelector('.logout')
    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            //console.log('the user signed out')
        })
        .catch((err) => {
            console.log(err.message)
        })
    })

    const loginForm = document.querySelector('.login')
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault()

        const email = loginForm.email.value
        const password = loginForm.password.value

        signInWithEmailAndPassword(auth, email, password).then((cred) => {
            //console.log('user logged in:', cred.user)
        }).catch((err) => {
            console.log(err.message)
        })
    })

    //Sub to auth changes
    const unsubAuth = onAuthStateChanged(auth, (user) => {
        console.log('user status changed:', user)
    })

    // unsub from changes
    const unsubButton = document.querySelector('.unsub')
    unsubButton.addEventListener('click', () => {
        console.log('unsubscribing')
        unsubCol()
        unsubDoc()
        unsubAuth()
    })

    let unsubscribe;


    // Hidden user data
    auth.onAuthStateChanged(user => {

        if (user) {

             // Get collection data
                const unsubCol = onSnapshot(q, (snapshot) => {
                  let locations = []
                  snapshot.docs.forEach((doc) => {
                      locations.push({ ...doc.data(), id: doc.id })
                  })
                document.getElementById('cityList1').innerHTML = snapshot.docs[0]._document.data.value.mapValue.fields.city.stringValue;
                document.getElementById('cityId1').innerHTML = "id: " + snapshot.docs[0]._document.key.path.segments[6];
                document.getElementById('cityList2').innerHTML = snapshot.docs[1]._document.data.value.mapValue.fields.city.stringValue;
                document.getElementById('cityId2').innerHTML = "id: " + snapshot.docs[1]._document.key.path.segments[6];
                document.getElementById('cityList3').innerHTML = snapshot.docs[2]._document.data.value.mapValue.fields.city.stringValue;
                document.getElementById('cityId3').innerHTML = "id: " + snapshot.docs[2]._document.key.path.segments[6];
                document.getElementById('cityList4').innerHTML = snapshot.docs[3]._document.data.value.mapValue.fields.city.stringValue;
                document.getElementById('cityId4').innerHTML = "id: " + snapshot.docs[3]._document.key.path.segments[6];
                document.getElementById('cityList5').innerHTML = snapshot.docs[4]._document.data.value.mapValue.fields.city.stringValue;
                document.getElementById('cityId5').innerHTML = "id: " + snapshot.docs[4]._document.key.path.segments[6];
              })
            
              


            

        } else {
            // Unsubscribe when the user signs out
            unsubscribe && unsubscribe();
        }
    });

})

