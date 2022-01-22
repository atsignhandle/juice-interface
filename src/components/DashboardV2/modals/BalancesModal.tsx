import { SettingOutlined } from '@ant-design/icons'
import { BigNumber } from '@ethersproject/bignumber'
import { Button, Modal, Space } from 'antd'
import ERC20TokenBalanceV1 from 'components/shared/ERC20TokenBalanceV1'
import { FormItems } from 'components/shared/formItems'
import ProjectTokenBalanceV1 from 'components/shared/ProjectTokenBalanceV1'
import { ProjectContext } from 'contexts/projectContext'
import { UserContextV1 } from 'contexts/userContextV1'
import { OperatorPermission, useHasPermission } from 'hooks/v1/HasPermission'
import { ProjectMetadataV3 } from 'models/project-metadata'
import { TokenRef } from 'models/token-ref'
import { useContext, useEffect, useState } from 'react'
import { uploadProjectMetadata } from 'utils/ipfs'

export default function BalancesModal({
  visible,
  onCancel,
}: {
  visible: boolean | undefined
  onCancel: () => void
}) {
  const [editModalVisible, setEditModalVisible] = useState<boolean>()
  const [loading, setLoading] = useState<boolean>()
  const [editingTokenRefs, setEditingTokenRefs] = useState<TokenRef[]>([])
  const { owner, projectId, metadata } = useContext(ProjectContext)
  const { transactor, contracts } = useContext(UserContextV1)

  useEffect(() => {
    setEditingTokenRefs(
      (metadata as ProjectMetadataV3)?.tokens ?? [{ type: 'erc20', value: '' }],
    )
  }, [metadata])

  const hasEditPermission = useHasPermission([OperatorPermission.SetUri])

  async function updateTokenRefs() {
    if (!transactor || !contracts || !projectId) return

    setLoading(true)

    const uploadedMetadata = await uploadProjectMetadata({
      ...metadata,
      tokens: editingTokenRefs.filter(t => t.type),
    })

    if (!uploadedMetadata?.success) {
      setLoading(false)
      return
    }

    transactor(
      contracts.Projects,
      'setUri',
      [projectId.toHexString(), uploadedMetadata.cid],
      {
        onDone: () => {
          setLoading(false)
          setEditModalVisible(false)
        },
      },
    )
  }

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 20,
          }}
        >
          {hasEditPermission ? (
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => setEditModalVisible(true)}
            >
              Edit tracked assets
            </Button>
          ) : (
            <div></div>
          )}
          <Button onClick={onCancel}>Done</Button>
        </div>
      }
    >
      <div>
        <h2>Assets</h2>
        <p>Other assets in this project's owner's wallet.</p>

        <Space direction="vertical" style={{ width: '100%', marginTop: 20 }}>
          <ProjectTokenBalanceV1
            wallet={owner}
            projectId={BigNumber.from('0x01')}
          />
          {(metadata as ProjectMetadataV3)?.tokens?.map(t =>
            t.type === 'erc20' ? (
              <ERC20TokenBalanceV1
                key={t.value}
                wallet={owner}
                tokenAddress={t.value}
              />
            ) : (
              <ProjectTokenBalanceV1
                key={t.value}
                wallet={owner}
                projectId={BigNumber.from(t.value)}
              />
            ),
          )}
        </Space>

        <Modal
          title="Edit tracked assets"
          visible={editModalVisible}
          onCancel={() => setEditModalVisible(false)}
          cancelText=""
          width={600}
          confirmLoading={loading}
          onOk={updateTokenRefs}
          okText="Save tracked assets"
        >
          <p style={{ marginBottom: 40 }}>
            Display ERC20 tokens and other Juicebox project tokens that are in
            this project's owner's wallet.
          </p>
          <FormItems.TokenRefs
            refs={editingTokenRefs}
            onRefsChange={setEditingTokenRefs}
          />
        </Modal>
      </div>
    </Modal>
  )
}