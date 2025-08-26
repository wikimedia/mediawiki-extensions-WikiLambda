/*!
 * WikiLambda Vue scroll utilities for hash-based navigation
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const scrollUtils = {
	/**
	 * Scrolls to an element with the given ID, with optional smooth scrolling
	 *
	 * @param {string} elementId - The ID of the element to scroll to (without #)
	 * @param {Object} options - Scroll options
	 * @param {string} options.behavior - Scroll behavior ('smooth' or 'auto')
	 * @param {string} options.block - Vertical alignment ('start', 'center', 'end', 'nearest')
	 * @param {string} options.inline - Horizontal alignment ('start', 'center', 'end', 'nearest')
	 * @param {number} options.offset - Additional offset from the top in pixels
	 * @param {number} options.delay - Delay before scrolling in milliseconds
	 * @return {Promise<boolean>} - Promise that resolves to true if element was found and scrolled to
	 */
	scrollToElement: function ( elementId, options = {} ) {
		const {
			behavior = 'smooth',
			block = 'start',
			inline = 'nearest',
			offset = 0,
			delay = 0
		} = options;

		return new Promise( ( resolve ) => {
			const executeScroll = () => {
				const element = document.getElementById( elementId );
				if ( !element ) {
					resolve( false );
					return;
				}

				// If there's an offset, we need to calculate the position manually
				if ( offset !== 0 ) {
					const elementRect = element.getBoundingClientRect();
					const absoluteElementTop = elementRect.top + window.pageYOffset;
					const targetPosition = absoluteElementTop - offset;

					window.scrollTo( {
						top: targetPosition,
						behavior
					} );
				} else {
					// Use native scrollIntoView for standard behavior
					element.scrollIntoView( {
						behavior,
						block,
						inline
					} );
				}

				resolve( true );
			};

			if ( delay > 0 ) {
				setTimeout( executeScroll, delay );
			} else {
				executeScroll();
			}
		} );
	},

	/**
	 * Scrolls to the element specified by the current URL hash
	 *
	 * @param {Object} options - Scroll options (same as scrollToElement)
	 * @return {Promise<boolean>} - Promise that resolves to true if hash element was found and scrolled to
	 */
	scrollToCurrentHash: function ( options = {} ) {
		const hash = window.location.hash;
		if ( !hash || hash.length <= 1 ) {
			return Promise.resolve( false );
		}

		// Remove the # from the hash
		const elementId = hash.slice( 1 );
		return this.scrollToElement( elementId, options );
	},

	/**
	 * Scrolls to an element after a delay, with retry logic for elements that might not be rendered yet
	 *
	 * @param {string} elementId - The ID of the element to scroll to (without #)
	 * @param {Object} options - Scroll options
	 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 10)
	 * @param {number} options.retryDelay - Delay between retries in milliseconds (default: 100)
	 * @return {Promise<boolean>} - Promise that resolves to true if element was eventually found and scrolled to
	 */
	scrollToElementWithRetry: function ( elementId, options = {} ) {
		const maxRetries = options.maxRetries || 10;
		const retryDelay = options.retryDelay || 100;
		const scrollOptions = Object.assign( {}, options );
		delete scrollOptions.maxRetries;
		delete scrollOptions.retryDelay;

		return new Promise( ( resolve ) => {
			let attempts = 0;

			const attemptScroll = () => {
				this.scrollToElement( elementId, scrollOptions ).then( ( success ) => {
					if ( success ) {
						resolve( true );
					} else if ( attempts < maxRetries ) {
						attempts++;
						setTimeout( attemptScroll, retryDelay );
					} else {
						resolve( false );
					}
				} );
			};

			attemptScroll();
		} );
	},

	/**
	 * Scrolls to the current hash with retry logic
	 *
	 * @param {Object} options - Scroll options (same as scrollToElementWithRetry)
	 * @return {Promise<boolean>} - Promise that resolves to true if hash element was eventually found and scrolled to
	 */
	scrollToCurrentHashWithRetry: function ( options = {} ) {
		const hash = window.location.hash;
		if ( !hash || hash.length <= 1 ) {
			return Promise.resolve( false );
		}

		// Remove the # from the hash
		const elementId = hash.slice( 1 );
		return this.scrollToElementWithRetry( elementId, options );
	},

	/**
	 * Debounced scroll to hash function to avoid multiple rapid calls
	 *
	 * @param {Object} options - Scroll options
	 * @param {number} debounceMs - Debounce delay in milliseconds (default: 250)
	 * @return {Function} - Debounced function
	 */
	createDebouncedHashScroll: function ( options = {}, debounceMs = 250 ) {
		let timeoutId = null;

		return () => {
			if ( timeoutId ) {
				clearTimeout( timeoutId );
			}

			timeoutId = setTimeout( () => {
				this.scrollToCurrentHashWithRetry( options );
			}, debounceMs );
		};
	}
};

module.exports = scrollUtils;
