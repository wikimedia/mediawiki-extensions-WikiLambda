/*!
 * WikiLambda unit test suite for the Job Queue store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'Languages Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();

		store.activeJob = null;
		store.delayMs = 200;
		store.queue = [];

		jest.useFakeTimers();
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	describe( 'Getters', () => {
		describe( 'nextWaitingJob', () => {
			it( 'returns undefined if queue is empty', () => {
				expect( store.nextWaitingJob ).toBe( undefined );
			} );

			it( 'returns undefined if queue has no waiting jobs', () => {
				store.queue = [
					{ status: Constants.QUEUE_STATUS.PROCESSING },
					{ status: Constants.QUEUE_STATUS.RESOLVED },
					{ status: Constants.QUEUE_STATUS.RESOLVED },
					{ status: Constants.QUEUE_STATUS.PROCESSING },
					{ status: Constants.QUEUE_STATUS.REJECTED },
					{ status: Constants.QUEUE_STATUS.PROCESSING }
				];
				expect( store.nextWaitingJob ).toBe( undefined );
			} );

			it( 'returns the first added waiting job if there are many', () => {
				store.queue = [
					{ id: '111.1', status: Constants.QUEUE_STATUS.PROCESSING },
					{ id: '112.2', status: Constants.QUEUE_STATUS.WAITING },
					{ id: '113.3', status: Constants.QUEUE_STATUS.WAITING },
					{ id: '114.4', status: Constants.QUEUE_STATUS.WAITING }
				];
				expect( store.nextWaitingJob.id ).toBe( '112.2' );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'enqueue', () => {
			it( 'adds a new job to the queue', () => {
				// Override runJob so that the job is not mutated immediately
				store.runJob = jest.fn();
				const mockJob = jest.fn().mockResolvedValue( 'success!' );

				const job = store.enqueue( mockJob );

				expect( job ).toHaveProperty( 'id' );
				expect( job.status ).toBe( Constants.QUEUE_STATUS.WAITING );
				expect( typeof job.promise.then ).toBe( 'function' );
				expect( store.queue ).toContainEqual( job );
			} );

			it( 'immediately runs a job if no active job exists', async () => {
				const mockJob = jest.fn().mockResolvedValue( 'success!' );

				const job = store.enqueue( mockJob );

				await waitFor( () => expect( job.status ).toBe( Constants.QUEUE_STATUS.RESOLVED ) );
				await expect( job.promise ).resolves.toBe( 'success!' );
			} );

			it( 'queues a job and waits if there is an already active job', async () => {
				const mockFirstJob = jest.fn().mockResolvedValue( 'one success!' );
				const mockSecondJob = jest.fn().mockResolvedValue( 'another success!' );

				store.enqueue( mockFirstJob );
				const job = store.enqueue( mockSecondJob );

				expect( store.queue ).toContainEqual( job );
				expect( job.status ).toBe( Constants.QUEUE_STATUS.WAITING );
			} );
		} );

		describe( 'runJob', () => {
			it( 'runs a job and resolves its promise', async () => {
				const mockJob = jest.fn().mockResolvedValue( 'success!' );
				const job = store.enqueue( mockJob );

				await expect( job.promise ).resolves.toBe( 'success!' );
				expect( job.status ).toBe( Constants.QUEUE_STATUS.RESOLVED );
			} );

			it( 'runs a job and rejects its promise on error', async () => {
				const mockJob = jest.fn().mockRejectedValue( new Error( 'failure!' ) );
				const job = store.enqueue( mockJob );

				await expect( job.promise ).rejects.toThrow( 'failure!' );
				expect( job.status ).toBe( Constants.QUEUE_STATUS.REJECTED );
			} );

			it( 'removes finished job from queue and schedules the next one', async () => {
				const firstJob = jest.fn().mockResolvedValue( 'first' );
				const secondJob = jest.fn().mockResolvedValue( 'second' );

				const job1 = store.enqueue( firstJob );
				const job2 = store.enqueue( secondJob );

				// first job should finish
				await expect( job1.promise ).resolves.toBe( 'first' );
				expect( job1.status ).toBe( Constants.QUEUE_STATUS.RESOLVED );

				// first job is deleted from the queue and next job is scheduled
				await waitFor( () => expect( store.queue ).not.toContainEqual( job1 ) );

				// Fast-forward timers so second job runs
				jest.advanceTimersByTime( store.delayMs );

				await expect( job2.promise ).resolves.toBe( 'second' );
				expect( job2.status ).toBe( Constants.QUEUE_STATUS.RESOLVED );

				// second job is deleted from the queue and next job is scheduled
				await waitFor( () => expect( store.queue ).not.toContainEqual( job2 ) );

				// Fast-forward timers so activeJob is set to null
				jest.advanceTimersByTime( store.delayMs );
				expect( store.activeJob ).toBe( null );
			} );
		} );
	} );
} );
