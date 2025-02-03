<!--
	WikiLambda Vue component for the implementations/tests table in the ZFunction Viewer Details tab.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-viewer-details-table">
		<cdx-table
			:caption="title"
			:pending="isLoading"
			:columns="columns"
			:data="data"
			:paginate="columns.length > 5"
			:pagination-size-options="[ { value: 5 }, { value: 10 }, { value: 20, value: 50 } ]"
			:aria-label="title"
			class="ext-wikilambda-app-function-viewer-details-table___table-container"
		>
			<template #header>
				<div v-if="canConnect || canDisconnect">
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
			</template>

			<template #thead>
				<thead v-if="columns.length">
					<tr>
						<template v-for="( column, index ) in columns">
							<th
								v-if="column"
								:key="index"
								:class="column.class"
								:colspan="column.colspan"
							>
								<template v-if="column.component">
									<component :is="column.component" v-bind="column.props">
										{{ column.title || "" }}
									</component>
								</template>
								<template v-else>
									{{ column.title || column.title === '' ? column.title : column }}
								</template>
							</th>
						</template>
					</tr>
				</thead>
			</template>

			<template
				v-for="column in columns"
				:key="column.id"
				#[`item-${column.id}`]="{ item }">
				<template v-if="item && item.component">
					<component :is="item.component" v-bind="item.props">
						{{ item.title || "" }}
					</component>
				</template>
				<template v-else>
					{{ item.title || item.title === '' ? item.title : item }}
				</template>
			</template>

			<template #empty-state>
				{{ emptyText }}
			</template>
		</cdx-table>
	</div>
</template>

<script>
const { CdxButton, CdxCheckbox, CdxIcon, CdxInfoChip, CdxTable } = require( '@wikimedia/codex' );
const { defineComponent } = require( 'vue' );
const icons = require( '../../../../lib/icons.json' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ),
	Constants = require( '../../../Constants.js' ),
	useBreakpoints = require( '../../../composables/useBreakpoints.js' ),
	FunctionTesterTable = require( './FunctionTesterTable.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-viewer-details-table-codex',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'cdx-info-chip': CdxInfoChip,
		'cdx-table': CdxTable,
		'cdx-checkbox': CdxCheckbox,
		'wl-function-tester-table': FunctionTesterTable
	},
	mixins: [ typeUtils ],
	props: {
		columns: {
			type: Array,
			required: false,
			default: function () {
				return [];
			}
		},
		data: {
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
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-viewer-details-table {
	margin-bottom: @spacing-200;

	.ext-wikilambda-app-function-viewer-details-table___table-container {
		.cdx-table__table {
			thead th {
				white-space: nowrap;
				overflow-wrap: break-word;
			}

			tbody td a {
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

				@media screen and ( max-width: @max-width-breakpoint-mobile ) {
					-webkit-line-clamp: 1;
					height: 22.39px;
				}
			}
		}
	}
}

</style>
