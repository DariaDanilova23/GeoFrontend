import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '@auth0/auth0-angular';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { Layer } from 'ol/layer';
import GeoJSON from 'ol/format/GeoJSON';
import JSZip from 'jszip';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import shpwrite from '@mapbox/shp-write';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private workspaceName: string | null = '';
  private roles: string[] = [];
  private datastore = 'myvectorstore';
  constructor(private http: HttpClient, private auth: AuthService) { }

  getAuthToken(): Promise<string | null> {
    console.log("Запрос токена...");
    return firstValueFrom(this.auth.getAccessTokenSilently())
      .then(token => {
        console.log("Токен получен:", token);
        return token;
      })
      .catch(error => {
        console.error("Ошибка при получении токена:", error);
        return null;
      });
  }


  checkWorkspace(token: string): Promise<boolean> {
    console.log(`Проверка рабочего пространства: ${this.workspaceName}`);

    return this.http.get(`http://localhost:8080/geoserver/rest/workspaces`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'role': 'ADMIN'
      }
    }).toPromise()
      .then((response: any) => {
        const workspaceNames = response['workspaces']['workspace'].map((ws: any) => ws.name);
        return workspaceNames.includes(this.workspaceName); // Проверяем, существует ли рабочее пространство
      })
      .catch(error => {
        console.error('Ошибка при получении рабочих пространств:', error);
        throw error; // Пробрасываем ошибку дальше
      });
  }

  createWorkspace(token: string) {
    const createStoreUrl = `http://localhost:8080/geoserver/rest/workspaces`;
    const body = `<workspace><name>${this.workspaceName}</name></workspace>`;

    this.http.post(createStoreUrl, body, { //Создание workspace
      headers: {
        'Content-Type': 'application/xml',
        Authorization: `Bearer ${token}`,
        'role': 'ADMIN'
      },
      responseType: 'text'
    }).subscribe({
      next: () => {
        console.log('Store успешно создан');
      },
      error: (error) => {
        console.error('Ошибка создания workspace', error);
      },
    });
  }

  async checkCoverageStoreExists(store: string, token: string): Promise<boolean> {
    const url = `http://localhost:8080/geoserver/rest/workspaces/${this.workspaceName}/coveragestores/${store}.json`;

    try {
      await this.http.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'role': 'ADMIN'
        }
      }).toPromise();

      console.log(`⚠️ CoverageStore "${store}" уже существует.`);
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`CoverageStore "${store}" не найден, можно создавать.`);
        return false; // CoverageStore не существует → можно создавать
      }
      console.error(`Ошибка при проверке CoverageStore:`, error);
      return true; // Любая другая ошибка → считаем, что Store есть (чтобы не создавать дубликат)
    }
  }

  createCoverageStore(layerName: string, token: string) {
    try {
      var storeLink = `http://localhost:8080/geoserver/rest/workspaces/${this.workspaceName}/coveragestores`
      var storeBody = `
          <coverageStore>
            <name>${layerName}</name>
            <type>GeoTIFF</type>
            <enabled>true</enabled>
            <workspace>${this.workspaceName}</workspace>
            <url>file:data/raster.tif</url>
          </coverageStore>
        `;
      this.http.post(storeLink, storeBody, { //Создание заполнение workspace
        headers: {
          'Content-Type': 'text/xml',
          Authorization: `Bearer ${token}`,
          'role': 'ADMIN'
        },
        responseType: 'text'
      }).subscribe({
        next: () => {
          console.log('Store успешно заполнен');
        },
        error: (error) => {
          console.error('Ошибка создания store', error);
        },
      });
      return true;  // Теперь есть явный возврат
    } catch (error) {
      console.error(`Ошибка при создании CoverageStore`, error);
      return false; // Возвращаем false при ошибке
    }
  }

  /*
  async updateCoverageSRS(layerName: string, token: string) {
    const url = `http://localhost:8080/geoserver/rest/workspaces/${this.workspaceName}/coveragestores/${layerName}/coverages/${layerName}`;
    const body = `
    <coverage>
      <srs>EPSG:3857</srs>
      <nativeCRS>EPSG:3857</nativeCRS>
    </coverage>
  `;

    try {
      await this.http.put(url, body, {
        headers: {
          'Content-Type': 'application/xml',
          Authorization: `Bearer ${token}`,
          'role': 'ADMIN'
        },
        responseType: 'text'
      }).toPromise();
      console.log('SRS успешно обновлен!');
    } catch (error) {
      console.error('Ошибка при обновлении SRS:', error);
    }
  }

  */
  async uploadTiff(formData: FormData, layerName: string, token: string) {
    // Логируем FormData
    console.log("Форма с данными uploadTiff:");
    formData.forEach((value, key) => {
      console.log(key, value); // Проверяем содержимое FormData
    });
    try {
      const url = `http://localhost:8080/geoserver/rest/workspaces/${this.workspaceName}/coveragestores/${layerName}/file.geotiff`;
      this.http.put(url, formData.get('file'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'role': 'ADMIN'
        },
        responseType: 'text'
      }).toPromise();
      return true;
    } catch (error) {
      console.warn(` Слой не опубликован на GeoServer.`);
      return false;
    }
  }

  // Загрузка растрового слоя
  async uploadRasterLayer(formData: FormData, layerName: string) {
    // Логируем FormData
    console.log("Форма с данными: uploadRasterLayer");
    formData.forEach((value, key) => {
      console.log(key, value); // Проверяем содержимое FormData
    });
    const token: string | null = await this.getAuthToken(); // Получаем токен перед началом работы
    console.log(token);
    if (!token) {
      throw new Error('Не удалось получить токен!');
    }
    const exists = await this.checkWorkspace(token);
    console.log(exists);
    if (!exists) {
      this.createWorkspace(token);
      console.log(`Workspace "geoportal" не существует`);
    } else {
      console.log(`Workspace "geoportal" уже существует`);
    }
    //еСЛИ СУЩЕСТВУЕТ ВОЗВРАЩАТЬ ИЗ МЕТОДА СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЮ О ТОМ ЧТО НУЖНО ЗАДАТЬ ДРУГОЕ ИМЯ
    var existCoverageStore = await this.checkCoverageStoreExists(layerName, token);
    if (existCoverageStore) {
      alert(`Слой с таким именем уже существует. Попробуйте еще раз с другим именем.`);
      return false; //Тут нужно добавить обработку типа измените имя
    }

    const storeCreated = await this.createCoverageStore(layerName, token);
    if (!storeCreated) {
      throw new Error(`Ошибка при создании CoverageStore `);
    }


    var layerPublished = await this.uploadTiff(formData, layerName, token);
    if (layerPublished) {
      // await this.updateCoverageSRS(layerName, token);
      console.log(`Слой  успешно опубликован!`);
      return true;
    } else {
      console.error(` Ошибка: Слой не опубликован в GeoServer.`);
      return false;
    }
  }

  async checkDataStore(token: string, dataStoreName: string): Promise<boolean> {
    const url = `http://localhost:8080/geoserver/rest/workspaces/${this.workspaceName}/datastores/${dataStoreName}`;
    try {
      const response = await this.http.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'role': 'ADMIN',
          'Accept': 'application/json'
        },
        observe: 'response'
      }).toPromise();
      if (response)
        return response.status === 200;
      else return false
    } catch (error: any) {
      if (error.status === 404) {
        return false; // DataStore не существует
      } else {
        console.error('Ошибка при проверке существования dataStore:', error);
        throw error;
      }
    }
  }

 
  async createDataStore( datastore: string) {
    const token: string | null = await this.getAuthToken();
    if (!token) {
      throw new Error('Не удалось получить токен!');
    }
    const url = `http://localhost:8080/geoserver/rest/workspaces/d.d.danilova2001/datastores`;
    const xmlBody = `
    <dataStore>
      <name>${datastore}</name>
      <connectionParameters>
        <entry key="url">file:data/${datastore}</entry>
      </connectionParameters>
    </dataStore>`;

    try {
      const response = await this.http.post(url, xmlBody, {
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Bearer ${token}`,
          'role': 'ADMIN'
        },
        responseType: 'text'
      }).toPromise();

      console.log('Datastore создан:', response);
    } catch (error: any) {
      console.error('Ошибка при создании datastore:', error);
    }
  }
  public async uploadGeoJson(features: Feature<Geometry>[], layerName: string) {
    const geojson = new GeoJSON().writeFeaturesObject(features);
    const token: string | null = await this.getAuthToken();
    if (!token) {
      throw new Error('Не удалось получить токен!');
    }
    const base64zip = await shpwrite.zip(geojson); // возвращает строку base64

    // Конвертируем base64 → Uint8Array
    function base64ToUint8Array(base64: any): Uint8Array {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    const zipBytes = base64ToUint8Array(base64zip);

    const blob = new Blob([zipBytes], { type: 'application/zip' });
    this.workspaceName = this.workspaceName || 'd.d.danilova2001';
    const url = `http://localhost:8080/geoserver/rest/workspaces/${this.workspaceName}/datastores/${this.datastore}/file.shp`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/zip',
      Authorization: `Bearer ${token}`,
      'role': 'ADMIN'
    });

    return this.http.put(url, blob, { headers }).toPromise();
  }
  
  // Загрузка векторного слоя
  public async uploadVectorLayer(formData: FormData, layerName: string) {
    const file = formData.get('file') as File;
    const filename = file.name;
    const fileNameWithoutExt = filename.split('.').slice(0, -1).join('.');
    const token: string | null = await this.getAuthToken();
    if (!token) {
      throw new Error('Не удалось получить токен!');
    }

    // Проверка существования рабочей области
    const workspaceExists = await this.checkWorkspace(token);
    if (!workspaceExists) {
      await this.createWorkspace(token);
    }

    // Проверка существования dataStore
    const dataStoreExists = await this.checkDataStore(token, layerName);
    if (dataStoreExists) {
      alert(`DataStore с именем '${layerName}' уже существует.`);
      return;
    }

    // Загрузка файла без автоматической публикации слоя
    const uploadUrl = `http://localhost:8080/geoserver/rest/workspaces/${this.workspaceName}/datastores/${layerName}/file.shp?configure=none`;
    await this.http.put(uploadUrl, formData, {
      headers: {
        'Content-Type': 'application/zip',
        Authorization: `Bearer ${token}`,
        'role': 'ADMIN'
      },
    }).toPromise();

    // Явная публикация слоя с заданным именем
    const featureTypeUrl = `http://localhost:8080/geoserver/rest/workspaces/${this.workspaceName}/datastores/${layerName}/featuretypes`;
    const featureTypeXml = `
    <featureType>
      <name>${layerName}</name>
      <nativeName>${fileNameWithoutExt}</nativeName>
      <title>${layerName}</title>
    </featureType>
  `;
    /**      <srs>EPSG:4326</srs> */
    await this.http.post(featureTypeUrl, featureTypeXml, {
      headers: {
        'Content-Type': 'application/xml',
        Authorization: `Bearer ${token}`,
        'role': 'ADMIN'
      },
    }).toPromise();

    alert('Векторный слой успешно загружен и опубликован');
  }




  // Вспомогательная функция для получения workspaceName
  setWorkspaceName(roles: string[], nickname: string|null) {
    if (roles.includes("provider")) {
      this.workspaceName = "geoportal";
    } else {
      this.workspaceName = nickname;
    }
  }
  async deleteLayers(raster: string[], vector: string[], nickname: string) {
    const token: string | null = await this.getAuthToken(); // Получаем токен перед началом работы
    vector.forEach((vectorLayer) => {
      this.http.delete('http://localhost:8080/geoserver/rest/workspaces/' + nickname + '/datastores/' + vectorLayer + '/?recurse=true', {
        headers: {
          Authorization: `Bearer ${token}`,
          'role': 'ADMIN'
        },
        responseType: 'text'
      }).toPromise();
    });
    raster.forEach((rasterLayer) => {
      this.http.delete('http://localhost:8080/geoserver/rest/workspaces/' + nickname + '/coveragestores/' + rasterLayer +'?recurse=true', {
        headers: {
          Authorization: `Bearer ${token}`,
          'role': 'ADMIN'
        },
        responseType: 'text'
      }).toPromise();
    });

  }
}
