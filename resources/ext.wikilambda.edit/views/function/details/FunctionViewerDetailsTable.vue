<template>
	<!--
		WikiLambda Vue component for the implementation table in the ZFunction Viewer Details tab.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-details-table">
		<table-container
			:header="header"
			:body="body"
			:is-loading="isLoading"
			class="ext-wikilambda-function-details-table__body"
		>
			<template #table-title>
				<div class="ext-wikilambda-function-details-table__title">
					<span class="ext-wikilambda-function-details-table__title__text">
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
		</table-container>
		<pagination
			v-if="totalPages > 1"
			:total-pages="totalPages"
			:current-page="currentPage"
			:showing-all="showingAll"
			@update-page="updateCurrentPage"
			@reset-view="resetView"
		></pagination>
	</div>
</template>

<script>
const CdxButton = require( '@wikimedia/codex' ).CdxButton,
	TableContainer = require( '../../../components/base/Table.vue' ),
	Pagination = require( '../../../components/base/Pagination.vue' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	Constants = require( '../../../Constants.js' ),
	useBreakpoints = require( '../../../composables/useBreakpoints.js' );

// @vue/component
module.exports = exports = {
	name: 'function-viewer-details-table',
	components: {
		'cdx-button': CdxButton,
		'table-container': TableContainer,
		pagination: Pagination
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
@import './../../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-details-table {
	margin-bottom: 40px;

	&__body {
		&-link {
			color: @wmui-color-accent50;
		}
	}

	&__row--active {
		background: @wmui-color-accent90;
	}

	&__empty {
		padding: 0 16px;
		font-weight: @font-weight-base;
		color: @wmui-color-base30;
		white-space: pre-wrap;
	}

	&__title {
		font-weight: @font-weight-bold;
		color: @wmui-color-base10;
		word-break: break-all;
		background: @wmui-color-base80;
		padding: 0 16px;
		height: 50px;
		display: flex;
		align-items: center;

		&__text {
			display: block;
			width: 100%;
			margin-right: 10px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		&__buttons {
			margin-left: auto;
			display: flex;
			column-gap: 12px;
		}
	}

	&-text {
		padding-right: 32px;
		font-weight: @font-weight-bold;
		color: @wmui-color-base10;
		word-break: break-all;

		&:first-child {
			width: 20px;
			padding-left: 16px;
			padding-right: 16px;
		}
	}

	&-item {
		padding-right: 16px;

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
		}

		&:first-child {
			padding-left: 16px;
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
