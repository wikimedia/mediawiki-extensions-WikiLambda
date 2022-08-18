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
			class="ext-wikilambda-function-details-table__body"
		>
			<template #table-title>
				<div class="ext-wikilambda-function-details-table__title">
					<span>
						{{ title }}
					</span>
					<!-- TODO (T310164):add button group for admin functions -->
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

const TableContainer = require( '../../../components/base/Table.vue' ),
	Pagination = require( '../../../components/base/Pagination.vue' ),
	typeUtils = require( '../../../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'function-viewer-details-table',
	components: {
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
		}
	},
	methods: {
		updateCurrentPage: function ( newPage ) {
			this.$emit( 'update-page', newPage );
		},
		resetView: function () {
			this.$emit( 'reset-view' );
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

	&-no-text {
		padding: 12px;
		font-weight: @font-weight-base;
		color: @wmui-color-base30;
	}

	&__title {
		font-weight: @font-weight-bold;
		color: @wmui-color-base10;
		word-break: break-all;
		background: @wmui-color-base80;
		padding: 14px 16px;
	}

	&-text {
		padding-right: 32px;
		font-weight: @font-weight-bold;
		color: @wmui-color-base10;
		word-break: break-all;

		&:first-child {
			padding-left: 16px;
		}
	}

	&-item {
		padding-right: 32px;
		word-break: break-all;

		&:first-child {
			padding-left: 16px;
		}
	}
}
</style>
