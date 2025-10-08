<!--
	WikiLambda Vue component for viewing a function examples.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-pagination" data-testid="pagination">
		<cdx-button class="ext-wikilambda-app-pagination__view-all" @click="resetView">
			{{ getButtonText }}
		</cdx-button>
		<div v-if="!showingAll" class="ext-wikilambda-app-pagination__container">
			<div class="ext-wikilambda-app-pagination__numbers">
				<input
					ref="pageInputComponent"
					class="ext-wikilambda-app-pagination__input"
					:max="totalPages"
					:value="currentPage"
					@input="resetPage"
				>
				<span class="ext-wikilambda-app-pagination__total-pages">/ {{ totalPages }} </span>
			</div>
			<cdx-button
				aria-label="Back"
				class="ext-wikilambda-app-pagination__action"
				:disabled="currentPage === 1"
				@click="updatePage( -1 )"
			>
				<cdx-icon :icon="iconPrevious" icon-label="Back"></cdx-icon>
			</cdx-button>
			<cdx-button
				aria-label="Next"
				class="ext-wikilambda-app-pagination__action"
				:disabled="currentPage === totalPages "
				@click="updatePage( 1 )"
			>
				<cdx-icon :icon="iconNext" icon-label="Next"></cdx-icon>
			</cdx-button>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );
const icons = require( '../../../lib/icons.json' );

// Codex components
const { CdxButton, CdxIcon } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-pagination',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	props: {
		totalPages: {
			type: Number,
			required: true
		},
		currentPage: {
			type: Number,
			required: false,
			default: 1
		},
		showingAll: {
			type: Boolean,
			default: false
		}
	},
	emits: [ 'update-page', 'reset-view' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );

		const iconNext = icons.cdxIconNext;
		const iconPrevious = icons.cdxIconPrevious;
		const pageInputComponent = ref( null );

		/**
		 * Returns the button text based on showingAll state
		 *
		 * @return {string}
		 */
		const getButtonText = computed( () => {
			if ( !props.showingAll ) {
				return i18n( 'wikilambda-function-viewer-details-table-view-all' ).text();
			}
			return i18n( 'wikilambda-function-viewer-details-table-view-less' ).text();
		} );

		/**
		 * Updates the current page by the given direction
		 *
		 * @param {number} direction
		 */
		function updatePage( direction ) {
			emit( 'update-page', props.currentPage + direction );
		}

		/**
		 * Resets the page based on input value
		 */
		function resetPage() {
			const inputValue = pageInputComponent.value.value;
			// if there is value in the input box and it is a number
			if ( inputValue && !isNaN( inputValue ) ) {
				// if input number is too low set to 1 and if it is too high set to last page
				if ( inputValue < 1 ) {
					emit( 'update-page', 1 );
				} else if ( inputValue > props.totalPages ) {
					emit( 'update-page', props.totalPages );
				} else {
					emit( 'update-page', Number( inputValue ) );
				}
			}
		}

		/**
		 * Resets the view to show all items
		 */
		function resetView() {
			emit( 'reset-view' );
		}

		return {
			getButtonText,
			iconNext,
			iconPrevious,
			pageInputComponent,
			resetPage,
			resetView,
			updatePage
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-pagination {
	padding-top: @spacing-50;
	padding-bottom: @spacing-100;
	display: flex;

	.ext-wikilambda-app-pagination__view-all {
		flex: none;
		height: @size-200;
	}

	.ext-wikilambda-app-pagination__container {
		display: flex;
		align-content: center;
		margin-left: auto;
	}

	.ext-wikilambda-app-pagination__input {
		width: @size-200;
		height: @size-200;
		margin: 0;
		text-align: center;
		border: 1px solid @border-color-base;
		border-radius: @border-radius-base;
		box-sizing: @box-sizing-base;
	}

	.ext-wikilambda-app-pagination__total-pages {
		height: @size-200;
		text-align: center;
		padding: 0 6px;
	}

	.ext-wikilambda-app-pagination__action {
		padding-left: 0;
		padding-right: 0;
		margin-left: @spacing-50;
	}
}
</style>
