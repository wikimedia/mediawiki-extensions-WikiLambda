<!--
	WikiLambda Vue component for the implementation table in the ZFunction Viewer Details tab.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-details-table">
		<wl-table
			:header="header"
			:body="body"
			:is-loading="isLoading"
			:aria-labelledby="'ext-wikilambda-function-details-table__title__text-' + name"
			class="ext-wikilambda-function-details-table__body"
		>
			<template #table-title>
				<div class="ext-wikilambda-function-details-table__title">
					<span
						:id="'ext-wikilambda-function-details-table__title__text-' + name"
						class="ext-wikilambda-function-details-table__title__text">
						{{ title }}
					</span>
					<!-- TODO (T310164): replace with button group -->
					<div class="ext-wikilambda-function-details-table__title__buttons">
						<cdx-button
							v-if="!( isMobile && !canApprove )"
							class="ext-wikilambda-function-details-table__title__buttons__approve-button"
							:disabled="!canApprove"
							@click="approve">
							<label> {{ $i18n( 'wikilambda-function-details-table-approve' ).text() }} </label>
						</cdx-button>
						<cdx-button
							v-if="!( isMobile && !canDeactivate )"
							class="ext-wikilambda-function-details-table__title__buttons__deactivate-button"
							:disabled="!canDeactivate"
							@click="deactivate"
						>
							<label> {{ $i18n( 'wikilambda-function-details-table-deactivate' ).text() }} </label>
						</cdx-button>
					</div>
				</div>
			</template>
			<template #table-empty-text>
				<div class="ext-wikilambda-function-details-table__empty">
					<span>{{ emptyText }}</span>
				</div>
			</template>
		</wl-table>
		<wl-pagination
			v-if="totalPages > 1"
			:total-pages="totalPages"
			:current-page="currentPage"
			:showing-all="showingAll"
			@update-page="updateCurrentPage"
			@reset-view="resetView"
		></wl-pagination>
	</div>
</template>

<script>
const CdxButton = require( '@wikimedia/codex' ).CdxButton,
	TableContainer = require( '../../../base/Table.vue' ),
	Pagination = require( '../../../base/Pagination.vue' ),
	typeUtils = require( '../../../../mixins/typeUtils.js' ),
	Constants = require( '../../../../Constants.js' ),
	useBreakpoints = require( '../../../../composables/useBreakpoints.js' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-viewer-details-table',
	components: {
		'cdx-button': CdxButton,
		'wl-table': TableContainer,
		'wl-pagination': Pagination
	},
	mixins: [ typeUtils ],
	props: {
		header: {
			type: Object,
			required: true
		},
		body: {
			type: Array,
			default: function () {
				return [];
			}
		},
		title: {
			type: String,
			required: false,
			default: ''
		},
		emptyText: {
			type: String,
			default: ''
		},
		currentPage: {
			type: Number,
			default: 1
		},
		totalPages: {
			type: Number,
			default: 0
		},
		showingAll: {
			type: Boolean,
			defualt: false
		},
		canApprove: {
			type: Boolean,
			required: true
		},
		canDeactivate: {
			type: Boolean,
			required: true
		},
		isLoading: {
			type: Boolean,
			default: false
		},
		name: {
			type: String,
			required: true
		}
	},
	setup: function () {
		var breakpoint = useBreakpoints( Constants.breakpoints );
		return {
			breakpoint
		};
	},
	computed: {
		isMobile: function () {
			return this.breakpoint.current.value === Constants.breakpointsTypes.MOBILE;
		}
	},
	methods: {
		updateCurrentPage: function ( newPage ) {
			this.$emit( 'update-page', newPage );
		},
		resetView: function () {
			this.$emit( 'reset-view' );
		},
		approve: function () {
			this.$emit( 'approve' );
		},
		deactivate: function () {
			this.$emit( 'deactivate' );
		}
	}
};
</script>

<style lang="less">
@import '../../../../ext.wikilambda.edit.less';

.ext-wikilambda-function-details-table {
	margin-bottom: @spacing-250;

	&__body {
		&-link {
			color: @color-progressive;
		}
	}

	&__row--active {
		background: @background-color-progressive-subtle;
	}

	&__empty {
		padding: 0 @spacing-100;
		font-weight: @font-weight-normal;
		color: @color-placeholder;
		white-space: pre-wrap;
	}

	&__title {
		font-weight: @font-weight-bold;
		color: @color-base;
		word-break: break-all;
		background: @background-color-interactive;
		padding: 0 @spacing-100;
		height: 50px;
		display: flex;
		align-items: center;

		&__text {
			display: block;
			width: 100%;
			margin-right: @spacing-50;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		&__buttons {
			margin-left: auto;
			display: flex;
			column-gap: @spacing-75;
		}
	}

	&-text {
		padding-right: @spacing-200;
		font-weight: @font-weight-bold;
		color: @color-base;
		word-break: break-all;

		&:first-child {
			width: @size-125;
			padding-left: @spacing-100;
			padding-right: @spacing-100;
		}

		.cdx-checkbox {
			display: flex;
			flex-direction: column;
			justify-content: center;
		}
	}

	&-item {
		padding-right: @spacing-100;

		a {
			display: block; /* Fallback for non-webkit */
			display: -webkit-box;
			width: max-content;
			max-width: 244px;
			max-height: 44.78px; /* Fallback for non-webkit */
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			word-break: break-all;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.cdx-checkbox {
			width: 22.85px;
			display: flex;
			flex-direction: column;
			justify-content: center;
		}

		&:first-child {
			padding-left: @spacing-100;
		}
	}

	@media screen and ( max-width: @width-breakpoint-tablet ) {
		&-item {
			a {
				-webkit-line-clamp: 1;
				height: 22.39px;
			}
		}
	}
}
</style>
