import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MapComponent } from './map/map.component';
import { UploadComponent } from './upload/upload.component'
import { IndexComponent } from './index/index.component'

const routes: Routes = [
  { path: 'map', component: MapComponent },
  { path: '', redirectTo: '/map', pathMatch: 'full' }, // по умолчанию перенаправляем на /map
  { path: 'upload', component: UploadComponent },
  { path: 'index/:indexType', component: IndexComponent } //Для расчёта вегетации
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { 
  
}
