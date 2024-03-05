<!--
	WikiLambda Vue component for viewing a function examples.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-pagination">
		<cdx-button class="ext-wikilambda-pagination__view-all" @click="resetView">
			{{ getButtonText }}
		</cdx-button>
		<div class="ext-wikilambda-pagination__page-selector">
			<div class="ext-wikilambda-pagination__page-selector__main">
				<input
					ref="pageInput"
					class="ext-wikilambda-pagination__page-selector__input"
					:max="totalPages"
					:value="currentPage"
					@input="resetPage"
				>
				<span class="ext-wikilambda-pagination__page-selector__total-pages">/ {{ totalPages }} </span>
			</div>
			<cdx-button
				class="ext-wikilambda-pagination__page-selector__action"
				:disabled="currentPage === 1"
				@click="updatePage( -1 )"
			>
				<cdx-icon :icon="icons.cdxIconPrevious" icon-label="Back"></cdx-icon>
			</cdx-button>
			<cdx-button
				class="ext-wikilambda-pagination__page-selector__action"
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
	name: 'wl-pagination-component',
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
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-pagination {
	padding-top: @spacing-50;
	padding-bottom: @spacing-100;
	display: flex;

	&__view-all {
		flex: none;
		height: @size-200;
	}

	&__page-selector {
		display: flex;
		align-content: center;
		margin-left: auto;

		&__input {
			width: @size-200;
			height: @size-200;
			margin: 0;
			text-align: center;
			border: 1px solid @border-color-base;
			border-radius: @border-radius-base;
			box-sizing: @box-sizing-base;
		}

		&__total-pages {
			height: @size-200;
			text-align: center;
			padding: 0 6px;
		}

		&__action {
			padding-left: 0;
			padding-right: 0;
			margin-left: @spacing-50;
		}
	}
}
</style>
