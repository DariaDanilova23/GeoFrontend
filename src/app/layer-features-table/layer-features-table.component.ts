import { Component, Input, Output, EventEmitter, OnChanges, OnInit } from '@angular/core';
import { Feature } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import { Geometry } from 'ol/geom';

@Component({
  selector: 'app-layer-features-table',
  templateUrl: './layer-features-table.component.html',
  styleUrls: ['./layer-features-table.component.css']
})
export class LayerFeaturesTableComponent  {
  //features: Feature<Geometry>[] = [];
  //fields: string[] = [];
  @Input() features: Feature<Geometry>[] = [];
  @Input() fields: string[] = [];
  @Output() featuresChange = new EventEmitter<Feature<Geometry>[]>();
  @Output() fieldsChange = new EventEmitter<string[]>();


  extractFields(features: Feature<Geometry>[]): string[] {
    if (!features.length) return [];
    return Object.keys(features[0].getProperties()).filter(k => k !== 'geometry');
  }

  updateValue(feature: Feature<Geometry>, field: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    feature.set(field, value);
    this.featuresChange.emit(this.features); // уведомляем родителя
  }

  deleteRow(index: number) {
    this.features.splice(index, 1);
    this.featuresChange.emit(this.features); // уведомляем родителя
  }

  addField() {
    const newField = prompt('Введите название нового поля');
    if (newField && !this.fields.includes(newField)) {
      this.fields.push(newField);
      this.features.forEach(f => f.set(newField, ''));
      this.fieldsChange.emit(this.fields);  // эмитим наверх список полей
      this.featuresChange.emit(this.features); // уведомляем родителя
    }
  }
}
