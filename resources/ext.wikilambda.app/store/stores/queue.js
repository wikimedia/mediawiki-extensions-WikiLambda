/*!
 * WikiLambda Vue editor: Handle the request of function calls to the orchestrator. (Pinia)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );

module.exports = {
	state: {
		activeJob: null,
		delayMs: 200,
		queue: []
	},

	getters: {
		/**
		 * Returns next available job to run (must be in a waiting state).
		 *
		 * @param {Object} state
		 * @return {Object} job
		 */
		nextWaitingJob: function ( state ) {
			return state.queue.filter( ( job ) => job.status === Constants.QUEUE_STATUS.WAITING )[ 0 ];
		}
	},

	actions: {
		/**
		 * Creates a job and adds it to the queue.
		 * If there is no running job at the moment, initiates
		 * the execution of queue jobs.
		 *
		 * @param {Function} run - job to add to the queue, must return a Promise
		 * @return {Object} job
		 */
		enqueue: function ( run ) {
			let resolver;
			const promise = new Promise( ( resolve, reject ) => {
				resolver = { resolve, reject };
			} );

			const job = {
				id: `${ Date.now() }.${ Math.random().toFixed( 6 ).slice( -6 ) }`,
				status: Constants.QUEUE_STATUS.WAITING,
				promise,
				run,
				resolver
			};

			// Add job to the state queue
			this.queue.push( job );

			// If no active job, start running this one
			if ( !this.activeJob ) {
				this.runJob( job );
			}

			return job;
		},
		/**
		 * Runs a job in the queue. Once the job has been run,
		 * it resolves the Promise, removes the job from the queue
		 * and schedules it to run the next job in the queue after
		 * some delay.
		 *
		 * @param {Object} job
		 */
		runJob: function ( job ) {
			// Set job as active job
			this.activeJob = job;
			job.status = Constants.QUEUE_STATUS.PROCESSING;

			// Run job run function
			job.run()
				.then( ( result ) => {
					job.status = Constants.QUEUE_STATUS.RESOLVED;
					job.resolver.resolve( result );
				} )
				.catch( ( err ) => {
					job.status = Constants.QUEUE_STATUS.REJECTED;
					job.resolver.reject( err );
				} )
				.finally( () => {
					// Remove from queue when finished
					this.queue = this.queue.filter( ( j ) => j.id !== job.id );

					// Schedule the job, after a short delay:
					// * run next job in the queue, or
					// * set activeJob to null if the queue is empty
					setTimeout( () => {
						const nextJob = this.nextWaitingJob;

						// If there is no next job, set activeJob to null and exit
						if ( !nextJob ) {
							this.activeJob = null;
							return;
						}

						// Else, run next job
						this.runJob( nextJob );
					}, this.delayMs );
				} );
		}
	}
};
