<!--
	WikiLambda Vue component for viewing a function examples.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-table"
		:data-has-border="isBordered"
	>
		<div class="ext-wikilambda-table__title">
			<slot name="table-title"></slot>
		</div>
		<cdx-progress-bar
			v-if="isLoading"
			class="ext-wikilambda-table__loading"
			inline
		>
		</cdx-progress-bar>
		<div class="ext-wikilambda-table__body">
			<div v-if="!header && body.length === 0" class="ext-wikilambda-table__body__empty">
				<slot name="table-empty-text"></slot>
			</div>
			<table v-else class="ext-wikilambda-table__content">
				<thead v-if="!hideHeader" class="ext-wikilambda-table__content__header ext-wikilambda-table__content">
					<tr>
						<template v-for="( n, i ) in header">
							<th
								v-if="n"
								:key="i"
								class="ext-wikilambda-table__content__item ext-wikilambda-table__content__item--header"
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
						class="ext-wikilambda-table__content"
						:class="n ? ( n.class ? n.class : '' ) : ''"
					>
						<template v-for="( _, item ) in header">
							<td
								v-if="n && item in n"
								:key="item"
								class="ext-wikilambda-table__content__item"
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
const { defineComponent } = require( 'vue' );
const CdxProgressBar = require( '@wikimedia/codex' ).CdxProgressBar,
	CdxCheckbox = require( '@wikimedia/codex' ).CdxCheckbox,
	ZObjectToString = require( '../default-view-types/ZObjectToString.vue' ),
	FunctionTesterTable = require( '../function/viewer/FunctionTesterTable.vue' ),
	CdxInfoChip = require( '@wikimedia/codex' ).CdxInfoChip,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon;

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

.ext-wikilambda-table {
	position: relative;
	border: 1px solid @border-color-subtle;
	border-radius: @border-radius-base;

	&__title {
		white-space: nowrap;
	}

	&__loading {
		position: absolute;
	}

	&__body {
		width: 100%;
		overflow-x: auto;

		table {
			margin: 0;
		}

		&__empty {
			height: 50px;
			display: flex;
			align-items: center;
		}
	}

	&__content {
		position: relative;
		width: 100%; // This is the fallback for non WebKit / Mozilla-based browsers.
		width: -moz-available;
		width: -webkit-fill-available;
		border-collapse: collapse;

		&__item {
			align-items: center;
			vertical-align: middle;
			border-top: 1px solid @background-color-interactive;
			font-size: 1em;
			line-height: 1.4em;
			letter-spacing: -0.003em;
			padding: 12px 0 12px 0;

			span,
			div,
			a {
				font-size: 1em;
				line-height: 1.4em;
			}

			&:last-child {
				border-right: 0;
			}
		}

		&__header {
			.ext-wikilambda-table__content__item {
				border-top: 0;
				border-bottom: 1px solid @border-color-subtle;
				white-space: nowrap;

				&--header {
					text-align: left;
				}
			}

			div.ext-wikilambda-table__content__item--header:last-of-type {
				border-right: 0;
			}
		}
	}

	&[ data-has-border='true' ] {
		.ext-wikilambda-table__content .ext-wikilambda-table__content__item {
			border-top: 1px solid @border-color-subtle;
			border-right: 1px solid @border-color-subtle;
		}

		.ext-wikilambda-table__content .ext-wikilambda-table__content__item:last-child {
			border-right: 0;
		}
	}
}
</style>
