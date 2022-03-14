<template>
	<!--
		WikiLambda Vue component for a navigation tab

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<template v-if="!tooltipVisible">
			<button
				class="ext-wikilambda-tab"
				:class="statusClass"
				:disabled="disabled"
				@click="$emit( 'click' )"
			>
				<cdx-icon v-if="icon" :icon="icon"></cdx-icon>
				{{ title }}
			</button>
		</template>
		<tooltip
			v-else
			class="ext-wikilambda-tab_tooltip-container"
			:content="tooltipContent"
			:header="tooltipHeader"
			:icon-color="getTooltipColor"
		>
			<button
				class="ext-wikilambda-tab"
				:class="statusClass"
				:disabled="disabled"
				@click="$emit( 'click' )"
			>
				<cdx-icon v-if="icon" :icon="icon"></cdx-icon>
				{{ title }}
			</button>
		</tooltip>
	</div>
</template>

<script>
var CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	Tooltip = require( './Tooltip.vue' );

// @vue/component
module.exports = exports = {
	name: 'tab-item',
	components: {
		'cdx-icon': CdxIcon,
		// TOOD (T298040): replace with codex tooltip/popover component
		tooltip: Tooltip
	},
	props: {
		status: {
			type: String,
			default: 'active'
		},
		title: {
			type: String,
			required: true
		},
		disabled: {
			type: Boolean,
			default: false,
			required: false
		},
		icon: {
			type: [ String, Object ],
			default: null,
			required: false
		},
		// tooltip properties
		tooltipContent: {
			type: String,
			default: null,
			required: false
		},
		tooltipHeader: {
			type: String,
			default: null,
			required: false
		},
		tooltipVisible: {
			type: Boolean
		}
	},
	computed: {
		statusClass: function () {
			// disabled styles trump inactive styles
			if ( this.disabled ) {
				return 'ext-wikilambda-tab-status_disabled';
			}
			return 'ext-wikilambda-tab-status_' + this.status;
		}
	},
	methods: {
		getTooltipColor: function () {
			return 'A2A9B1';
		}
	}
};
</script>

<style lang="less">

.ext-wikilambda-tab {
	font-size: 14;
	font-style: normal;
	font-weight: bold;
	line-height: normal;
	text-align: left;
	background: none;
	border-left: 0;
	border-right: 0;
	border-top: 0;
	border-color: #fff;
	border-style: solid;
	margin-right: 20px;
	padding-bottom: 10px;
	display: flex;
	align-items: center;

	&_tooltip-container {
		color: @inactive-color;
		border-color: @inactive-color;
	}

	.cdx-icon {
		border-radius: 100%;
		border-width: 1px;
		border-style: solid;
		padding: 3px;
		height: 14px;
		width: 14px;
		margin-right: 6px;
	}
}

@active-color:#3366CC;
@inactive-color: #000000;
@disabled-color: #A2A9B1;

.ext-wikilambda-tab-status {
	// the current tab
	&_active {
		color: @active-color;
		border-color: @active-color;

		.cdx-icon {
			border-color: @active-color;
		}
	}

	// not current, but clickable
	&_inactive {
		color: @inactive-color;

		.cdx-icon {
			border-color: @inactive-color;
		}
	}

	// not clickable
	&_disabled {
		color: @disabled-color;

		.cdx-icon {
			border-color: @disabled-color;
		}
	}

	// in case an unexpected status is passed
	&_undefined {
		color: @inactive-color;

		.cdx-icon {
			border-color: @inactive-color;
		}
	}
}

</style>
