<!--
	WikiLambda Vue component for the implementation table in the ZFunction Viewer Details tab.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-function-details-table">
		<wl-table
			:header="header"
			:hide-header="!header"
			:body="body"
			:is-loading="isLoading"
			:aria-labelledby="'ext-wikilambda-function-details-table__title__text-' + type"
			class="ext-wikilambda-function-details-table__body"
		>
			<template #table-title>
				<div class="ext-wikilambda-function-details-table__title">
					<span
						:id="'ext-wikilambda-function-details-table__title__text-' + type"
						class="ext-wikilambda-function-details-table__title__text">
						{{ title }}
					</span>
					<div
						v-if="canConnect || canDisconnect"
						class="ext-wikilambda-function-details-table__title__buttons"
					>
						<cdx-button
							v-if="!( isMobile && !canConnect )"
							:disabled="!canConnect"
							data-testid="connect"
							@click="connect"
						>
							<label> {{ $i18n( 'wikilambda-function-details-table-approve' ).text() }} </label>
						</cdx-button>
						<cdx-button
							v-if="!( isMobile && !canDisconnect )"
							:disabled="!canDisconnect"
							data-testid="disconnect"
							@click="disconnect"
						>
							<label> {{ $i18n( 'wikilambda-function-details-table-deactivate' ).text() }} </label>
						</cdx-button>
					</div>
					<div v-else>
						<a :href="addLink" data-testid="add-link">
							<cdx-button weight="quiet" aria-label="Add">
								<cdx-icon :icon="icons.cdxIconAdd"></cdx-icon>
							</cdx-button>
						</a>
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
const { defineComponent } = require( 'vue' );
const CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../../lib/icons.json' ),
	TableContainer = require( '../../base/Table.vue' ),
	Pagination = require( '../../base/Pagination.vue' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	Constants = require( '../../../Constants.js' ),
	useBreakpoints = require( '../../../composables/useBreakpoints.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-viewer-details-table',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'wl-table': TableContainer,
		'wl-pagination': Pagination
	},
	mixins: [ typeUtils ],
	props: {
		type: {
			type: String,
			required: true
		},
		header: {
			type: Object,
			required: false,
			default: null
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
		canConnect: {
			type: Boolean,
			required: true
		},
		canDisconnect: {
			type: Boolean,
			required: true
		},
		isLoading: {
			type: Boolean,
			default: false
		},
		addLink: {
			type: String,
			required: true
		}
	},
	setup: function () {
		const breakpoint = useBreakpoints( Constants.breakpoints );
		return {
			breakpoint
		};
	},
	data: function () {
		return {
			icons: icons
		};
	},
	computed: {
		/**
		 * Whether the display is of the size of a mobile screen
		 *
		 * @return {boolean}
		 */
		isMobile: function () {
			return this.breakpoint.current.value === Constants.breakpointsTypes.MOBILE;
		}
	},
	methods: {
		/**
		 * Emits the event update-page when selecting
		 * a page number to display
		 *
		 * @param {number} newPage
		 */
		updateCurrentPage: function ( newPage ) {
			this.$emit( 'update-page', newPage );
		},
		/**
		 * Emits the event reset-view when switching
		 * the view all/view less toggle button
		 */
		resetView: function () {
			this.$emit( 'reset-view' );
		},
		/**
		 * Emits an event when the connect button is clicked
		 */
		connect: function () {
			this.$emit( 'connect' );
		},
		/**
		 * Emits an event when the disconnect button is clicked
		 */
		disconnect: function () {
			this.$emit( 'disconnect' );
		}
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-function-details-table {
	margin-bottom: @spacing-200;

	&__body {
		&-link {
			color: @color-progressive;
		}
	}

	&__row--active {
		background: @background-color-progressive-subtle;
	}

	&__empty {
		padding: 0 12px;
		font-weight: @font-weight-normal;
		color: @color-placeholder;
		white-space: pre-wrap;
	}

	&__title {
		font-weight: @font-weight-bold;
		color: @color-base;
		overflow-wrap: break-word;
		background: @background-color-base;
		padding: 6px 6px 0 12px;
		display: flex;
		align-items: center;

		&__text {
			display: block;
			width: 100%;
			margin-right: @spacing-50;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			font-size: @font-size-large;
			padding-top: 6px;
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
		overflow-wrap: break-word;

		&:first-child {
			width: @size-125;
			padding-left: 12px;
			padding-right: 12px;
		}

		.cdx-checkbox {
			display: flex;
			flex-direction: column;
			justify-content: center;
		}
	}

	&-item {
		padding-right: 12px;

		a {
			display: block; /* Fallback for non-webkit */
			display: -webkit-box;
			width: max-content;
			max-width: 244px;
			max-height: 44.78px; /* Fallback for non-webkit */
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow-wrap: break-word;
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
			padding-left: 12px;
		}
	}

	@media screen and ( max-width: @max-width-breakpoint-mobile ) {
		&-item {
			a {
				-webkit-line-clamp: 1;
				height: 22.39px;
			}
		}
	}
}
</style>
