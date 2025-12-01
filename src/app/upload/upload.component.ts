import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UploadService } from '../../app/upload.service';


@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  formGroup: FormGroup;
  selectedFile: File | null = null;
  selectedTab: 'raster' | 'vector' = 'raster';

  constructor(private fb: FormBuilder, private uploadService: UploadService) {
    this.formGroup = this.fb.group({
      layerName: [''],
      layerDate: [''],
      file: [null],
    });
  }

  ngOnInit() {
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    this.formGroup.patchValue({ file: this.selectedFile });
  }

  onSubmit() {
    if (this.formGroup.valid) {
      const layerName = this.formGroup.get('layerName')?.value;

      // Подготовка данных для отправки
      const formData = new FormData();
      formData.append('file', this.selectedFile as Blob);
      formData.append('layerName', layerName);

      if (this.selectedTab === 'vector') {
        const layerDate = this.formGroup.get('layerDate')?.value;
        formData.append('layerDate', layerDate);
        this.uploadService.uploadVectorLayer(formData, layerName);
      }
      else {
        console.log("растр");
        this.uploadService.uploadRasterLayer(formData, layerName);
      }
    }
  }

  switchTab(tab: 'raster' | 'vector') {
    this.selectedTab = tab;
  }

  onCancel() {
    this.formGroup.reset();
    this.selectedFile = null;
  }
}
