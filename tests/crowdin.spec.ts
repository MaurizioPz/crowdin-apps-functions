import {
    updateOrCreateFile,
    getFolder,
    getOrCreateFolder,
    uploadTranslations,
    updateSourceFiles,
    FileEntity,
} from '../src';
import Crowdin, {
    ResponseList,
    ResponseObject,
    SourceFiles,
    SourceFilesModel,
    TranslationsModel,
    UploadStorageModel,
} from '@crowdin/crowdin-api-client';
import { createMock } from 'ts-auto-mock';

describe('UpdateOrCreateFile function', () => {
    let client: Crowdin;
    let spyProjectId: number;
    let spyFileId: number;
    let spyRequest: SourceFilesModel.ReplaceFileFromStorageRequest | SourceFilesModel.RestoreFile;

    beforeEach(() => {
        client = createMock<Crowdin>({
            uploadStorageApi: {
                addStorage: (): Promise<ResponseObject<UploadStorageModel.Storage>> => {
                    return createMock<Promise<ResponseObject<UploadStorageModel.Storage>>>();
                },
            },
            sourceFilesApi: {
                updateOrRestoreFile: (
                    projectId: number,
                    fileId: number,
                    request: SourceFilesModel.ReplaceFileFromStorageRequest | SourceFilesModel.RestoreFile,
                ): Promise<ResponseObject<SourceFilesModel.File>> => {
                    spyProjectId = projectId;
                    spyRequest = request;
                    spyFileId = fileId;
                    return createMock<Promise<ResponseObject<SourceFilesModel.File>>>();
                },
                createFile: (
                    projectId: number,
                    request: SourceFilesModel.CreateFileRequest,
                ): Promise<ResponseObject<SourceFilesModel.File>> => {
                    spyProjectId = projectId;
                    spyRequest = request;
                    return createMock<Promise<ResponseObject<SourceFilesModel.File>>>();
                },
            },
        });
    });

    it('should create file when source file is undefined', async () => {
        await updateOrCreateFile(client, 1, 'name', 'title', 'auto', 2, null, undefined).then(result => {
            expect(result).toBe(0);
            expect(spyProjectId).toBe(1);
            expect(spyRequest).toStrictEqual({
                storageId: 0,
                name: 'name',
                title: 'title',
                type: 'auto',
                directoryId: 2,
            });
        });
    });

    it('should update file when source file is defined', async () => {
        const file = createMock<SourceFilesModel.File>({
            id: 3,
        });

        await updateOrCreateFile(client, 1, 'name', 'title', 'auto', 2, null, file).then(result => {
            expect(result).toBe(3);
            expect(spyProjectId).toBe(1);
            expect(spyFileId).toBe(3);
            expect(spyRequest).toStrictEqual({
                storageId: 0,
            });
        });
    });
});

describe('GetFolder function', () => {
    let client: Crowdin;
    let spyMaxLimit: number | undefined;
    let spyProjectId: number;
    let spyRequest: SourceFilesModel.CreateDirectoryRequest;
    let spyFileId: number;
    let spyRequestUpdateOrRestoreFile: SourceFilesModel.ReplaceFileFromStorageRequest | SourceFilesModel.RestoreFile;
    let spyOptions: SourceFilesModel.ListProjectFilesOptions | undefined;
    let file: SourceFilesModel.File;
    let directory: SourceFilesModel.Directory;
    const parentFolder = createMock<SourceFilesModel.Directory>({ name: 'parentFolder', id: 3 });

    beforeEach(() => {
        file = createMock<SourceFilesModel.File>();
        directory = createMock<SourceFilesModel.Directory>();
        client = createMock<Crowdin>({
            sourceFilesApi: {
                withFetchAll: (maxLimit?: number): SourceFiles => {
                    spyMaxLimit = maxLimit;
                    const mock = createMock<SourceFiles>({
                        listProjectDirectories: (
                            projectId: number,
                        ): Promise<ResponseList<SourceFilesModel.Directory>> => {
                            spyProjectId = projectId;
                            return new Promise<ResponseList<SourceFilesModel.Directory>>(resolve => {
                                resolve(
                                    createMock<ResponseList<SourceFilesModel.Directory>>({
                                        data: [
                                            createMock<ResponseObject<SourceFilesModel.Directory>>({
                                                data: directory,
                                            }),
                                        ],
                                    }),
                                );
                            });
                        },
                    });
                    mock.listProjectFiles = ((
                        projectId: number,
                        options?: SourceFilesModel.ListProjectFilesOptions,
                    ): Promise<ResponseList<SourceFilesModel.File>> => {
                        spyProjectId = projectId;
                        spyOptions = options;
                        return new Promise<ResponseList<SourceFilesModel.File>>(resolve => {
                            resolve(
                                createMock<ResponseList<SourceFilesModel.File>>({
                                    data: [
                                        createMock<ResponseObject<SourceFilesModel.File>>({
                                            data: file,
                                        }),
                                    ],
                                }),
                            );
                        });
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    }) as any;
                    return mock;
                },
                createDirectory: (
                    projectId: number,
                    request: SourceFilesModel.CreateDirectoryRequest,
                ): Promise<ResponseObject<SourceFilesModel.Directory>> => {
                    spyProjectId = projectId;
                    spyRequest = request;
                    return new Promise<ResponseObject<SourceFilesModel.Directory>>(resolve => {
                        resolve(
                            createMock<ResponseObject<SourceFilesModel.Directory>>({
                                data: createMock<SourceFilesModel.Directory>({
                                    branchId: request.branchId,
                                    directoryId: request.directoryId,
                                    name: request.name,
                                    title: request.title,
                                    exportPattern: request.exportPattern,
                                    priority: request.priority,
                                }),
                            }),
                        );
                    });
                },
                updateOrRestoreFile: (
                    projectId: number,
                    fileId: number,
                    request: SourceFilesModel.ReplaceFileFromStorageRequest | SourceFilesModel.RestoreFile,
                ): Promise<ResponseObject<SourceFilesModel.File>> => {
                    spyProjectId = projectId;
                    spyRequestUpdateOrRestoreFile = request;
                    spyFileId = fileId;
                    return createMock<Promise<ResponseObject<SourceFilesModel.File>>>();
                },
            },
        });
    });

    it('retrieves folder and files in it', async () => {
        const folder = createMock<SourceFilesModel.Directory>({ name: 'directoryName', id: 2 });
        const directories = [folder];

        await getFolder(directories, client, 1, folder.name).then(result => {
            expect(result).toStrictEqual({ files: [file], folder: folder });
            expect(spyMaxLimit).toBe(undefined);
            expect(spyProjectId).toBe(1);
            expect(spyOptions).toStrictEqual({ directoryId: 2 });
        });
    });

    it('filters by parentFolder', async () => {
        const folder = createMock<SourceFilesModel.Directory>({
            name: 'directoryName',
            id: 2,
            directoryId: parentFolder.id,
        });

        const directories = [folder];
        await getFolder(directories, client, 1, folder.name, parentFolder).then(result => {
            expect(result).toStrictEqual({ files: [file], folder: folder });
            expect(spyMaxLimit).toBe(undefined);
            expect(spyProjectId).toBe(1);
            expect(spyOptions).toStrictEqual({ directoryId: 2 });
        });
    });

    describe('GetOrCreateFolder function', () => {
        it('retrieves existing folder and files in it', async () => {
            const folder = createMock<SourceFilesModel.Directory>({
                name: 'directoryName',
                id: 2,
                directoryId: parentFolder.id,
            });
            const directories = [folder];

            await getOrCreateFolder(directories, client, 1, folder.name, parentFolder).then(result => {
                expect(result).toStrictEqual({ files: [file], folder: folder, created: false });
                expect(spyMaxLimit).toBe(undefined);
                expect(spyProjectId).toBe(1);
            });
        });

        it('creates new folder and files in it', async () => {
            const folder = createMock<SourceFilesModel.Directory>({
                name: 'directoryName',
                id: 0,
                directoryId: parentFolder.id,
                branchId: undefined,
                exportPattern: undefined,
                priority: undefined,
                title: undefined,
            });
            const directories: SourceFilesModel.Directory[] = [];

            await getOrCreateFolder(directories, client, 1, folder.name, parentFolder).then(result => {
                expect(result).toStrictEqual({ files: [file], folder: folder, created: true });
                expect(spyMaxLimit).toBe(undefined);
                expect(spyProjectId).toBe(1);
                expect(spyRequest).toStrictEqual({ directoryId: 3, name: 'directoryName' });
            });
        });

        it('creates new folder and files in it', async () => {
            const folder = createMock<SourceFilesModel.Directory>({
                name: 'directoryName',
                id: 0,
                directoryId: undefined,
                branchId: undefined,
                exportPattern: undefined,
                priority: undefined,
                title: undefined,
            });
            const directories: SourceFilesModel.Directory[] = [];

            await getOrCreateFolder(directories, client, 1, folder.name).then(result => {
                expect(result).toStrictEqual({ files: [file], folder: folder, created: true });
                expect(spyMaxLimit).toBe(undefined);
                expect(spyProjectId).toBe(1);
                expect(spyRequest).toStrictEqual({ directoryId: undefined, name: 'directoryName' });
            });
        });

        describe('UpdateSourceFiles function', () => {
            it('updates or creates the file', async () => {
                const fileEntities = [createMock<FileEntity>()];
                await updateSourceFiles(client, 1, 'directoryName', fileEntities).then(() => {
                    expect(spyProjectId).toBe(1);
                    expect(spyRequestUpdateOrRestoreFile).toStrictEqual({ storageId: 0 });
                    expect(spyFileId).toBe(0);
                });
            });
        });
    });
});

describe('UploadTranslations function', () => {
    let client: Crowdin;
    let spyFileName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let spyRequestAddStorage: any;
    let spyContentType: string | undefined;

    beforeEach(() => {
        client = createMock<Crowdin>({
            uploadStorageApi: {
                addStorage: (
                    fileName: string,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    request: any,
                    contentType?: string,
                ): Promise<ResponseObject<UploadStorageModel.Storage>> => {
                    spyFileName = fileName;
                    spyRequestAddStorage = request;
                    spyContentType = contentType;
                    return new Promise<ResponseObject<UploadStorageModel.Storage>>(resolve => {
                        resolve(
                            createMock<ResponseObject<UploadStorageModel.Storage>>({
                                data: createMock<UploadStorageModel.Storage>({
                                    id: 3,
                                }),
                            }),
                        );
                    });
                },
            },
            translationsApi: {
                uploadTranslation: (
                    projectId: number,
                    languageId: string,
                    request: TranslationsModel.UploadTranslationRequest,
                ): Promise<ResponseObject<TranslationsModel.UploadTranslationResponse>> => {
                    return new Promise<ResponseObject<TranslationsModel.UploadTranslationResponse>>(resolve => {
                        resolve(
                            createMock<ResponseObject<TranslationsModel.UploadTranslationResponse>>({
                                data: createMock<TranslationsModel.UploadTranslationResponse>({
                                    languageId: languageId,
                                    projectId: projectId,
                                    storageId: request.storageId,
                                    fileId: request.fileId,
                                }),
                            }),
                        );
                    });
                },
            },
        });
    });

    it('uploads translations', async () => {
        const request = {
            importEqSuggestions: false,
            autoApproveImported: false,
            markAddedTranslationsAsDone: false,
            translateHidden: false,
        };
        await uploadTranslations(client, 1, 2, 'language', 'fileName', 'fileContent', request).then(result => {
            expect(result).toStrictEqual({ fileId: 2, languageId: 'language', projectId: 1, storageId: 3 });
            expect(spyFileName).toBe('fileName');
            expect(spyContentType).toBeUndefined();
            expect(spyRequestAddStorage).toBe('fileContent');
        });
    });
});
