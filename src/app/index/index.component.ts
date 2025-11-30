import { Component} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { UploadService } from '../../app/upload.service';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrl: './index.component.css'
})
export class IndexComponent {

  indexType!: 'NDVI' | 'CVI' | 'EVI';
  imageUrl: string | null = null;
  uploadForm: FormGroup;
  ndviImageUrl: string | null = null;
  isLoading = false;
  uploadedFileName: string | null = null;
  private roles: string[] = [];
  fileToUp: File | null = null;
  filePath: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient, private route: ActivatedRoute, private router: Router, private uploadService: UploadService) {
    this.uploadForm = this.fb.group({
      redImage: [null],
      nirImage: [null],
      blueImage: [null],
      greenImage: [null],
    });
  }
  ngOnInit() {
    this.indexType = this.route.snapshot.paramMap.get('indexType') as 'NDVI' | 'CVI' | 'EVI';

    /*if (sessionData.getNickname() && sessionData.getRoles()) {
      this.uploadService.setWorkspaceName(sessionData.getRoles(), sessionData.getNickname());
    }*/
  }


  onFileSelected(event: any, fieldName: string) {
    const file = event.target.files[0];
    if (file) {
      this.uploadForm.patchValue({ [fieldName]: file });
    }
  }
  uploadImages() {
    // Проверяем, выбраны ли все необходимые файлы
    if (!this.uploadForm.value.redImage || !this.uploadForm.value.nirImage) {
      alert('Выберите все снимки!');
      return;
    }

    // Извлекаем имя для файла (без расширения)
    this.uploadedFileName = this.uploadForm.value.redImage.name.substring(0, this.uploadForm.value.redImage.name.lastIndexOf('.'));

    // Формируем объект FormData для отправки файлов на сервер
    const formData = new FormData();
    formData.append('red_file', this.uploadForm.value.redImage);  // Добавляем красный канал
    formData.append('nir_file', this.uploadForm.value.nirImage);  // Добавляем ближний инфракрасный канал

    // Добавляем дополнительные каналы в зависимости от типа индекса (EVI или CVI)
    if (this.indexType === 'EVI') {
      formData.append('blue_file', this.uploadForm.value.blueImage);  // Добавляем синий канал для EVI
    }
    if (this.indexType === 'CVI') {
      formData.append('green_file', this.uploadForm.value.greenImage);  // Добавляем зелёный канал для CVI
    }

    // Устанавливаем флаг загрузки в true, чтобы показать индикатор загрузки
    this.isLoading = true;

    // Отправляем POST-запрос с файлами на сервер FastAPI
    this.http.post(`http://127.0.0.1:8000/${this.indexType}`, formData, { responseType: 'blob' }).subscribe(
      (response) => {
        // Убираем индикатор загрузки
        this.isLoading = false;

        // Генерируем имя для загруженного файла
        const fileName = `${this.indexType}_${this.uploadedFileName}.tiff`;

        // Создаём Blob объект из полученного ответа
        const blob = new Blob([response], { type: 'image/tiff' });

        // Генерируем URL для загрузки
        const url = window.URL.createObjectURL(blob);

        // Создаём элемент для скачивания и инициируем скачивание файла
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;  // Имя скачиваемого файла
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.fileToUp = new File([blob], fileName,{ type: 'image/tiff' })
        const formData = new FormData();
        formData.append('file', this.fileToUp);
        formData.append('layerName', `${this.indexType}_${this.uploadedFileName}`);
        // Вызов метода из uploadService
        this.uploadService.uploadRasterLayer(formData, `${this.indexType}_${this.uploadedFileName}`)
      },
      (error) => {
        // В случае ошибки загрузки
        this.isLoading = false;
        console.error('Ошибка загрузки:', error);
      }
    );
  }


   onPublishClick() {
    console.log("onPublishClick")
     if (!this.fileToUp) {
       console.error("Ошибка: файл не найден");
       return;
     }
     if (this.uploadService) { 
       console.log(this.fileToUp);

       const formData = new FormData();
       formData.append('file', this.fileToUp);
     
       formData.append('layerName', `${this.indexType}_${this.uploadedFileName}`);
     
       // Вызов метода из uploadService
        this.uploadService.uploadRasterLayer(formData, `${this.indexType}_${this.uploadedFileName}`)
         .then(response => {
           console.log('Загрузка завершена:', response);
         })
         .catch(error => {
           console.error('Ошибка загрузки:', error);
         });
    }
  }
}
