<!--
	WikiLambda Vue component for viewing a function examples.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-table"
		:class="{ 'ext-wikilambda-app-table--bordered': isBordered }"
	>
		<div class="ext-wikilambda-app-table__title">
			<slot name="table-title"></slot>
		</div>
		<cdx-progress-bar
			v-if="isLoading"
			class="ext-wikilambda-app-table__loading"
			inline
		>
		</cdx-progress-bar>
		<div class="ext-wikilambda-app-table__body">
			<div v-if="!header && body.length === 0" class="ext-wikilambda-app-table__body-empty">
				<slot name="table-empty-text"></slot>
			</div>
			<table v-else class="ext-wikilambda-app-table__container">
				<thead
					v-if="!hideHeader"
					class="ext-wikilambda-app-table__header">
					<tr>
						<template v-for="( n, i ) in header">
							<th
								v-if="n"
								:key="i"
								class="ext-wikilambda-app-table__item
								ext-wikilambda-app-table__item--header"
								:class="n.class"
								:colspan="n.colspan"
							>
								<template v-if="n.component">
									<component :is="n.component" v-bind="n.props">
										{{ n.title || "" }}
									</component>
								</template>
								<template v-else>
									{{ n.title || n.title === '' ? n.title : n }}
								</template>
							</th>
						</template>
					</tr>
				</thead>

				<tbody>
					<tr
						v-for="( n, i ) in body"
						:key="i"
						:class="n ? ( n.class ? n.class : '' ) : ''"
					>
						<template v-for="( _, item ) in header">
							<td
								v-if="n && item in n"
								:key="item"
								class="ext-wikilambda-app-table__item"
								:class="n[ item ] ? n[ item ].class : ''"
							>
								<template v-if="n[ item ].component">
									<component :is="n[ item ].component" v-bind="n[ item ].props">
										{{ n[ item ].title || "" }}
									</component>
								</template>
								<template v-else>
									{{ n[ item ].title || n[ item ].title === '' ? n[ item ].title : n[ item ] }}
								</template>
							</td>
						</template>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script>
const { CdxProgressBar, CdxCheckbox, CdxInfoChip, CdxButton, CdxIcon } = require( '@wikimedia/codex' );
const { defineComponent } = require( 'vue' );
const ZObjectToString = require( '../default-view-types/ZObjectToString.vue' ),
	FunctionTesterTable = require( '../function/viewer/FunctionTesterTable.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-table-container',
	components: {
		'cdx-progress-bar': CdxProgressBar,
		'cdx-checkbox': CdxCheckbox,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'cdx-info-chip': CdxInfoChip,
		'wl-z-object-to-string': ZObjectToString,
		'wl-function-tester-table': FunctionTesterTable
	},
	props: {
		// { language: "Language" } or { language: { title: "Language" mobile: false } }
		header: {
			type: [ Object, null ],
			required: false,
			default: null
		},
		// { language: "Language" } or { language: { title: "Language" component: 'chip', props: { text: 'active' } } }
		body: {
			type: Array,
			default: function () {
				return [];
			}
		},
		hideHeader: {
			type: Boolean,
			default: false
		},
		isBordered: {
			type: Boolean,
			default: false
		},
		isLoading: {
			type: Boolean,
			default: false
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-table {
	position: relative;
	border: 1px solid @border-color-subtle;
	border-radius: @border-radius-base;

	.ext-wikilambda-app-table__title {
		white-space: nowrap;
	}

	.ext-wikilambda-app-table__loading {
		position: absolute;
	}

	.ext-wikilambda-app-table__body {
		width: 100%;
		overflow-x: auto;
	}

	.ext-wikilambda-app-table__body-empty {
		height: 50px;
		display: flex;
		align-items: center;
	}

	.ext-wikilambda-app-table__container {
		position: relative;
		width: 100%; // This is the fallback for non WebKit / Mozilla-based browsers.
		width: -moz-available;
		width: -webkit-fill-available;
		border-collapse: collapse;
		margin: 0;
	}

	// This base mixin is used to style the table items
	.mixin-base-item-styles() {
		align-items: center;
		vertical-align: middle;
		font-size: 1em;
		line-height: 1.4em;
		letter-spacing: -0.003em;
		padding: 12px 0;

		span,
		div,
		a {
			font-size: 1em;
			line-height: 1.4em;
		}

		&:last-child {
			border-right: 0;
		}

		&--header {
			white-space: nowrap;
			text-align: left;

			&:last-of-type {
				border-right: 0;
			}
		}
	}

	.ext-wikilambda-app-table__item {
		.mixin-base-item-styles();
		border-top: 1px solid @background-color-interactive;

		&--header {
			border-top: 0;
			border-bottom: 1px solid @border-color-subtle;
		}
	}

	&--bordered {
		.ext-wikilambda-app-table__item {
			.mixin-base-item-styles();
			border-top: 1px solid @border-color-subtle;
			border-right: 1px solid @border-color-subtle;

			&--header {
				border-top: 1px solid @border-color-subtle;
				border-bottom: 1px solid @border-color-subtle;
			}
		}
	}
}
</style>
