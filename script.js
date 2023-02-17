'use strict';

class Workout {
  //Always use a lybrary to create goods IDs.
  id = (Date.now() + '').slice(-10);
  date = new Date();
  clicks = 0;
  constructor(distance, duration, coords) {
    this.distance = distance; // in km
    this.duration = duration; // in min
    this.coords = coords; // [lat, lng]
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  #name;
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  #name;
  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = (this.distance / this.duration) * 60;
    return this.speed;
  }
}

////////////////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #workouts = [];
  #map;
  #mapEvent;

  constructor() {
    //We add the methods that we want to initialize when an app is created into the constructor.

    //Get user's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Attach event listeners
    //All the event listeners go to the constructor
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    //  -------------   USING THE GEOLOCATION API

    //This function here takes as an input 2 callback functions: the first one is a callback fucntion that will be called on success, so whenever the browser successfully got the coordinates of the current position of the user, and the second callback is the error callback which is the one that gonna be when there happened an error while getting the coordinates.

    //Before, we check if the navigator exists:
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        //Success callback
        //it is called with a parameter which is called the position parameter.
        this._loadMap.bind(this),
        //Error callback
        function () {
          alert('Could not get your current position.');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com.ar/maps/@${latitude},${longitude},15z`);

    const userCoords = [latitude, longitude];

    //  -------------   DISPLAYING A MAP USING LEAFLET LIBRARY

    //site of leaflet -> dowload -> copy the code before the script on the html file
    //site of leaflet -> overview -> copy the sample code

    this.#map =
      L /*this is the main function that leaflet gives us as an entry point. L has some methods that we can use (map, tileLayer, marker) */.map(
        'map' /*this must be the id name of an element in our html, and it's in that element where the map will be displayed*/
      )
        .setView(userCoords, 13 /*The close of the view */);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(userCoords)
      .addTo(this.#map)
      .bindPopup('You re here!😀')
      .openPopup();

    //  -------------   DISPLAYING A MAP MARKER

    //we will create a mark where the user clicks.
    //The first thing to do is to add an event handler to the map, but not the usual event listener. We will do it on the map object, with the on method that comes from the leaflet library:
    this.#map.on('click', this._showForm.bind(this));

    //Render the markers into local storage
    this.#workouts.forEach(work => {
      this._renderWourkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    //  -------------  RENDERING WORKOUT INPUT FORM
    form.classList.remove('hidden'); //the form appears
    inputDistance.focus(); //put the focus on the field (to complete)
  }

  _toggleElevationField(e) {
    e.preventDefault();
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //Check if data is valid
      //We use a guard close, and that means thet we will basically check for the opposite of what we are originally interested in and if that opposite is true, then we simply return the function immediately.
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running(distance, duration, [lat, lng], cadence);
    }
    //If activity cycling, create cycling object
    if (type === 'cycling') {
      const elevGain = +inputElevation.value;
      //Check if data is valid
      if (
        !validInputs(distance, duration, elevGain) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling(distance, duration, [lat, lng], elevGain);
    }

    //Add new object to the workout array
    this.#workouts.push(workout);
    console.log(workout);

    //Render workout marker
    this._renderWourkoutMarker(workout);

    //Render workout
    this._renderWorkout(workout);

    //Hide form + clear input fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWourkoutMarker(workout) {
    //Render workout on map as a marker
    //inside the bind popup we can create popup objects
    //we can take it from the documentation of leaflet -> docs
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
  <li class="workout workout--${workout.type}" data-id="${workout.id}">
  <h2 class="workout__title">${workout.description}</h2>
  <div class="workout__details">
    <span class="workout__icon">${
      workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
    }</span>
    <span class="workout__value">${workout.distance}</span>
    <span class="workout__unit">km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⏱</span>
    <span class="workout__value">${workout.duration}</span>
    <span class="workout__unit">min</span>
  </div>`;

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //using the public interface
    workout.click();
  }

  _setLocalStorage() {
    //we need to pass a key and then a unique string, so we transform the object to a string.
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    //we transform back the string to an object. The problem with this is that we lose the prototype chain. The new objects that we recover from the local storage are ow just regular objects, they're no longer objects that we created by the running and cycling classes, so they will not be able to inherit any of their methods.
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  //Method to delete the info at local storage. It can be used from the console
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  //we write app.reset() into the console and then it is.
}

const app = new App();
