<template>
	<!--
		Wikilambda Vue component for publishing a zobject.
		Contains both the publish button and the dialog pop-up flow prior
		to submission.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<wl-widget-base class="ext-wikilambda-publish-widget">
		<template #main>
			<cdx-button
				class="ext-wikilambda-publish-widget__publish-button"
				action="progressive"
				:disabled="isDisabled"
				@click.stop="handlePublish"
			>
				{{ $i18n( 'wikilambda-publishnew' ).text() }}
			</cdx-button>
			<cdx-button
				v-if="showCancel"
				class="ext-wikilambda-publish-widget__cancel-button"
				action="destructive"
				weight="primary"
				@click.stop="handleCancel"
			>
				{{ $i18n( 'wikilambda-cancel' ).text() }}
			</cdx-button>
			<wl-publish-dialog
				:show-dialog="showPublishDialog"
				:should-unattach-implementation-and-tester="shouldUnattachImplementationAndTester"
				@close-dialog="closeDialog"
			></wl-publish-dialog>
		</template>
	</wl-widget-base>
</template>

<script>
var CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapActions = require( 'vuex' ).mapActions,
	WidgetBase = require( '../base/WidgetBase.vue' ),
	PublishDialog = require( './PublishDialog.vue' );

// @vue/component
module.exports = exports = {
	name: 'wl-publish-widget',
	components: {
		'cdx-button': CdxButton,
		'wl-publish-dialog': PublishDialog,
		'wl-widget-base': WidgetBase
	},
	props: {
		shouldUnattachImplementationAndTester: {
			type: Boolean,
			required: false,
			default: false
		},
		isDisabled: {
			type: Boolean,
			required: false,
			default: false
		},
		showCancel: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	data: function () {
		return {
			showPublishDialog: false
		};
	},
	methods: $.extend( {},
		mapActions( [ 'validateZObject' ] ),
		{
			handlePublish: function () {
				this.validateZObject().then( function ( isValid ) {
					if ( isValid ) {
						this.showPublishDialog = true;
					}
				}.bind( this ) );
			},
			handleCancel: function () {
				this.$emit( 'cancel' );
			},
			closeDialog: function () {
				this.showPublishDialog = false;
			}
		}
	)
};
</script>

<style lang="less">

.ext-wikilambda-publish-widget {
	&__publish-button {
		margin-right: 16px;
	}

	.cdx-card__text__title {
		display: none;
	}
}
</style>
