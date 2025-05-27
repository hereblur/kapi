import { Resource, SchemaHookParams } from '@kapi/core';
import PhotoModel, { Photo, PhotoSchema } from '../model/photo';

// This is where we create rest-resource for our model.
// this will wrap the model functions and create rest endpoints

export const PhotoResource = new Resource<Photo>('photo', PhotoSchema);
PhotoResource.model = PhotoModel;

// This run before database create
PhotoResource.addHook('preCreate',  (data: Photo, params: SchemaHookParams<Photo>) => {
    data.revision = 1;
    return data;
});

// This run before after database update
PhotoResource.addHook('postUpdate', async (data: Photo, params: SchemaHookParams<Photo>) => {
    console.log('data is updated by ', data, params.actor);
    return data;
});

// Hide the revision from clients
PhotoResource.addHook('postView', async (data: Photo, params: SchemaHookParams<Photo>) => {
    // This will not modify the original data
    data.revision = "*";
    return data;
});
