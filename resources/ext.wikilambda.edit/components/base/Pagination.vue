<template>
	<!--
		WikiLambda Vue component for viewing a function examples.

		@copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-pagination">
		<cdx-button @click="resetView">
			{{ getButtonText }}
		</cdx-button>
		<div class="ext-wikilambda-pagination-page-selector">
			<input
				ref="pageInput"
				class="ext-wikilambda-pagination-page-selector-input"
				:max="totalPages"
				:value="currentPage"
				@input="resetPage"
			>
			/
			{{ totalPages }}
			<cdx-button
				:disabled="currentPage === 1"
				@click="updatePage( -1 )"
			>
				<cdx-icon :icon="icons.cdxIconPrevious" icon-label="Back"></cdx-icon>
			</cdx-button>
			<cdx-button
				:disabled="currentPage === totalPages "
				@click="updatePage( 1 )"
			>
				<cdx-icon :icon="icons.cdxIconNext" icon-label="Next"></cdx-icon>
			</cdx-button>
		</div>
	</div>
</template>

<script>
var CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'pagination-component',
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
	data: function () {
		return {
			icons: icons
		};
	},
	computed: {
		getButtonText: function () {
			if ( !this.showingAll ) {
				return this.$i18n( 'wikilambda-function-viewer-details-table-view-all' ).text();
			}
			return this.$i18n( 'wikilambda-function-viewer-details-table-view-less' ).text();
		}
	},
	methods: {
		updatePage: function ( direction ) {
			this.$emit( 'update-page', this.currentPage + direction );
		},
		resetPage: function () {
			const inputValue = this.$refs.pageInput.value;
			// if there is value in the input box and it is a number
			if ( inputValue && !isNaN( inputValue ) ) {
				// if input number is too low set to 1 and if it is too high set to last page
				if ( inputValue < 1 ) {
					this.$emit( 'update-page', 1 );
				} else if ( inputValue > this.totalPages ) {
					this.$emit( 'update-page', this.totalPages );
				} else {
					this.$emit( 'update-page', inputValue );
				}
			}
		},
		resetView: function () {
			this.$emit( 'reset-view' );
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-pagination {
	padding: 18px 12px;
	display: flex;

	&-page-selector {
		margin-left: auto;
	}

	&-input {
		max-width: 30px;
	}
}
</style>
