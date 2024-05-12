import request from "supertest";
import { app } from "../index";

describe('index', () => {
    it('should return when searching with no params', (done) => {
        // search without anything returns all available tables at current time
        request(app).get('/reservation/search').expect(200, done);
    });
    describe('delete reservation', () => {
        // create reservation here
        it('should delete reservation', () => {});
        it('should return 404 for invalid reservation', (done) => {
            request(app).delete('/reservation/5').expect(404, done);
        });
        it('should return 404 when user is not on reservation', () => {})
    })
})