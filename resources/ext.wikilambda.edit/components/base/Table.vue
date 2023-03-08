<template>
	<!--
		WikiLambda Vue component for viewing a function examples.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
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
				<thead v-if="!hideHeader" class="ext-wikilambda-table__content__header ext-wikilambda-table__content__row">
					<tr>
						<template v-for="( n, i ) in header">
							<th
								v-if="n"
								:key="i"
								class="ext-wikilambda-table__content__row__item ext-wikilambda-table__content__row__item--header"
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
						class="ext-wikilambda-table__content__row"
						:class="n ? ( n.class ? n.class : '' ) : ''"
					>
						<template v-for="( _, item ) in header">
							<td
								v-if="n && item in n"
								:key="item"
								class="ext-wikilambda-table__content__row__item"
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
var CdxProgressBar = require( '@wikimedia/codex' ).CdxProgressBar,
	CdxCheckbox = require( '@wikimedia/codex' ).CdxCheckbox,
	ZFunctionTesterTable = require( '../function/ZFunctionTesterTable.vue' ),
	CdxInfoChip = require( '@wikimedia/codex' ).CdxInfoChip,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon;

// @vue/component
module.exports = exports = {
	name: 'wl-table-container',
	components: {
		'cdx-progress-bar': CdxProgressBar,
		'cdx-checkbox': CdxCheckbox,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'cdx-info-chip': CdxInfoChip,
		'wl-z-function-tester-table': ZFunctionTesterTable
	},
	props: {
		header: { // example: { language: "Language" } or { language: { title: "Language" mobile: false } }
			type: Object,
			required: true
		},
		body: { // example: { language: "Language" } or { language: { title: "Language" component: 'chip', props: { text: 'active' } } }
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
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-table {
	position: relative;
	border: 1px solid @border-color-subtle;

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

		&__row {
			&__item {
				height: 50px;
				align-items: center;
				vertical-align: middle;
				border-top: 1px solid @border-color-subtle;
				font-size: 1em;
				line-height: 1.4em;
				letter-spacing: -0.003em;

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
		}

		&__header {
			.ext-wikilambda-table__content__row__item {
				border-top: 0;
				white-space: nowrap;

				&--header {
					text-align: left;
				}
			}

			div.ext-wikilambda-table__content__row__item--header:last-of-type {
				border-right: 0;
			}
		}
	}

	&[ data-has-border='true' ] {
		.ext-wikilambda-table__content .ext-wikilambda-table__content__row__item {
			border-top: 1px solid @border-color-subtle;
			border-right: 1px solid @border-color-subtle;
		}

		.ext-wikilambda-table__content .ext-wikilambda-table__content__row__item:last-child {
			border-right: 0;
		}
	}
}
</style>
