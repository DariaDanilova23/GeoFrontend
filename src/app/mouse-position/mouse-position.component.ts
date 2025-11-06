import { Component, OnInit, Input, AfterViewInit, OnDestroy } from '@angular/core';
import Map from 'ol/Map';
import MousePosition from 'ol/control/MousePosition';
import { createStringXY } from 'ol/coordinate';

@Component({
  selector: 'app-mouse-position',
  template: '<div class="mouse-position" id="mouse-position"></div>',
  styleUrls: ['./mouse-position.component.css']
})
export class MousePositionComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() map!: Map;
  mousePositionControl: MousePosition | undefined;

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.addMousePositionControl();
  }

  ngOnDestroy(): void {
    if (this.mousePositionControl && this.map) {
      this.map.removeControl(this.mousePositionControl);
    }
  }

  addMousePositionControl(): void {
    if (this.map) {
      this.mousePositionControl = new MousePosition({
        coordinateFormat: createStringXY(4), 
        projection: 'EPSG:4326', 
        className: 'custom-mouse-position',
        target: document.getElementById('mouse-position')||''
      });

      this.map.addControl(this.mousePositionControl);
    }
  }
}
