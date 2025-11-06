import { Component, OnInit, Input } from '@angular/core';
import Map from 'ol/Map';
import Geolocation from 'ol/Geolocation';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
@Component({
  selector: 'app-geolocation',
  templateUrl: './geolocation.component.html',
  styleUrls: ['./geolocation.component.css']
})
export class GeolocationComponent implements OnInit {
  @Input() map!: Map;
  geolocation!: Geolocation;
  positionFeature: any;
  accuracyFeature: any;
  isGeolocationActive: boolean = false;

  constructor() { }

  ngOnInit(): void {
    if (this.map) {
      this.geolocation = new Geolocation({
        tracking: false,
        projection: this.map.getView().getProjection()
      });

      this.geolocation.on('change:position', () => {
        const coordinates = this.geolocation.getPosition();
        if (coordinates) {
          this.positionFeature.setGeometry(coordinates ? new Point(coordinates) : null);
          this.map.getView().setCenter(coordinates);
        }
      });

      this.positionFeature = new Feature();
      this.positionFeature.setStyle(new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({
            color: '#E92828'
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 2
          })
        })
      }));

      this.accuracyFeature = new Feature();

      const vectorSource = new VectorSource({
        features: [this.accuracyFeature, this.positionFeature]
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
      });

      this.map.addLayer(vectorLayer);
    }
  }

  toggleGeolocation() {
    this.isGeolocationActive = !this.isGeolocationActive;
    this.geolocation.setTracking(this.isGeolocationActive);

    if (!this.isGeolocationActive) {
      this.positionFeature.setGeometry(null);
      this.accuracyFeature.setGeometry(null);
    }
  }
}
